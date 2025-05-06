import { SupabaseClient } from '@supabase/supabase-js'; // Assuming you use the official client
import { Database } from '@/lib/database.types'; // Import generated types
import { addBusinessDays, diffBusinessDays } from '@/lib/utils'; // Assuming utils has these helpers

// --- Constants ---
const MOLDS_LUN_VIE = 270;
const MOLDS_SAB = 135;
const DIAS_POST_VACIADO = 3;
const DIAS_ENVIO = 3;
const DIAS_LABORABLES_SEMANA = 5; // Mon-Fri for week calculation
const DAILY_CAPACITY = 270; // Global molds available Mon-Fri
const SATURDAY_MULTIPLIER = 0.5;
const MERMA_RATE = 0.09; // 9% merma
const EFFECTIVE_DAILY_CAPACITY = DAILY_CAPACITY * (1 - MERMA_RATE);
const EFFECTIVE_SAT_CAPACITY = EFFECTIVE_DAILY_CAPACITY * SATURDAY_MULTIPLIER;

// --- Types ---
// Define interfaces for the data structures used internally

interface QueueItem {
    queue_id: number;
    cotizacion_producto_id: number;
    product_id: number;
    qty_total: number;
    qty_pendiente: number;
    premium: boolean;
    created_at: string; // ISO string date
    vueltas_max_dia: number;
    eta_start_date?: Date | string | null; // Allow string for input
    eta_end_date?: Date | string | null; // Allow string for input
    // --- Simulation-specific state ---
    sim_qty_pendiente?: number;
    sim_eta_start_date?: Date | null;
    sim_eta_end_date?: Date | null;
    sim_days_in_production?: number;
}

interface SimulationResult {
    item: QueueItem;
    startDate: Date | null;
    endDate: Date | null;
}

interface ETAResult {
    dias_espera_moldes: number;
    dias_vaciado: number;
    dias_post_vaciado: number;
    dias_envio: number;
    dias_totales: number;
    semanas_min: number;
    semanas_max: number;
    fecha_inicio_vaciado: string | null;
    fecha_fin_vaciado: string | null;
    fecha_entrega_estimada: string | null;
}

type ProductionQueueItem = Database['public']['Tables']['production_queue']['Row'] & {
  vueltas_max_dia?: number; // Added for simulation
  moldes_disponibles?: number; // Added for simulation
};

type ProductInfo = {
    vueltas_max_dia: number;
    moldes_disponibles: number;
};

// Helper to format date as YYYY-MM-DD string
function formatDate(date: Date | null): string | null {
    return date ? date.toISOString().split('T')[0] : null;
}

// Helper function to add BUSINESS days (Mon-Fri)
function addBusinessDays(startDate: Date, days: number): Date {
    const date = new Date(startDate.valueOf());
    let addedDays = 0;
    while (addedDays < days) {
        date.setDate(date.getDate() + 1);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        // Only count Monday (1) through Friday (5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            addedDays++;
        }
    }
    return date;
}

// Helper function to calculate difference in BUSINESS days (Mon-Fri)
function diffBusinessDays(date1: Date, date2: Date): number {
    let diff = 0;
    const start = new Date(Math.min(date1.getTime(), date2.getTime()));
    const end = new Date(Math.max(date1.getTime(), date2.getTime()));
    start.setHours(0, 0, 0, 0); // Ensure comparison starts at day beginning
    end.setHours(0, 0, 0, 0);

    // Clone start date to avoid modifying it
    const current = new Date(start);

    while (current < end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Count Mon-Fri
            diff++;
        }
        current.setDate(current.getDate() + 1);
    }
    // If the end date itself is a business day, it counts as part of the duration
    // Note: This includes the start date but excludes the end date. Add 1 for inclusive duration?
    // Let's adjust based on how ETAResult expects dias_vaciado
    // If eta_start and eta_end are the same business day, diff is 0. We need 1 day.
    // If eta_start is Mon, eta_end is Tue, diff is 1. We need 2 days.
    // So, we add 1 if the end date is a business day and start/end are different,
    // or if start/end are the same business day.

    const endDayOfWeek = end.getDay();
    if(endDayOfWeek >= 1 && endDayOfWeek <= 5) {
       // If start and end are the same business day, diff is 0, return 1
       if (start.getTime() === end.getTime()) return 1;
       // Otherwise, return the difference + 1 for inclusive range
       return diff + 1;
    } else {
        // If end date is weekend, the difference calculation is sufficient
        // unless start/end were same non-business day (e.g. Sat to Sat, diff=0, should be 0)
        if (start.getTime() === end.getTime()) return 0;
        return diff;
    }

}

export class ProductionPlannerService {
    private supabase: SupabaseClient<Database>;

    constructor(supabaseClient: SupabaseClient<Database>) {
        this.supabase = supabaseClient;
    }

    // Fetches queue items ready for simulation, joins to get vueltas_max_dia
    private async _fetchQueueForSimulation(): Promise<QueueItem[]> {
        const { data, error } = await this.supabase
            .from('production_queue')
            .select(`
                *,
                cotizacion_productos!inner (
                    producto_id,
                    productos!inner ( vueltas_max_dia )
                )
            `)
            .in('status', ['queued', 'in_progress']) // Only fetch items not done/cancelled
            .order('premium', { ascending: false }) // Premium first
            .order('created_at', { ascending: true }); // Then FIFO by creation

        if (error) {
            console.error('Error fetching production queue for simulation:', error);
            throw new Error('Failed to fetch production queue.');
        }

        // Transform data, ensuring vueltas_max_dia is correctly extracted
        const queueItems: QueueItem[] = data.map((item: any) => {
             // Safely navigate the potentially complex nested structure
             const vueltas = item.cotizacion_productos?.productos?.vueltas_max_dia ?? 1;
             return {
                 queue_id: item.queue_id,
                 cotizacion_producto_id: item.cotizacion_producto_id,
                 product_id: item.cotizacion_productos?.producto_id, // Get product_id from relation
                 qty_total: item.qty_total,
                 qty_pendiente: item.qty_pendiente, // Use actual pending qty
                 premium: item.premium,
                 created_at: item.created_at,
                 vueltas_max_dia: vueltas,
                 eta_start_date: item.eta_start_date, // Keep original dates
                 eta_end_date: item.eta_end_date,
                 status: item.status // Include status if needed elsewhere
             };
         }).filter(item => item.product_id != null); // Filter out items where product_id couldn't be determined


        console.log(`[_fetchQueueForSimulation] Fetched ${queueItems.length} items for simulation.`);
        return queueItems;
    }


    // Core simulation logic - takes a snapshot of queue items
    private _runSimulation(queueSnapshot: QueueItem[]): Map<number, SimulationResult> {
        console.log(`[_runSimulation] Starting simulation for ${queueSnapshot.length} items.`);
        const simulationResults = new Map<number, SimulationResult>();
        const itemsToProcess = new Map<number, QueueItem>(); // Use map for efficient lookup/update

        // Initialize simulation state for each item
        queueSnapshot.forEach(item => {
            itemsToProcess.set(item.queue_id, {
                ...item,
                sim_qty_pendiente: item.qty_pendiente > 0 ? item.qty_pendiente : item.qty_total, // Reset pending if needed or use existing
                sim_eta_start_date: null,
                sim_eta_end_date: null,
                sim_days_in_production: 0
            });
        });

        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // Start simulation from today
        let remainingItemsCount = itemsToProcess.size;

        const MAX_SIMULATION_DAYS = 365 * 2; // Safety break: 2 years
        let simulationDay = 0;

        while (remainingItemsCount > 0 && simulationDay < MAX_SIMULATION_DAYS) {
            simulationDay++;
            const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
            let moldesDisponiblesHoy = 0;

            // Determine available molds based on day of week
            if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday - Friday
                moldesDisponiblesHoy = MOLDS_LUN_VIE;
            } else if (dayOfWeek === 6) { // Saturday
                moldesDisponiblesHoy = MOLDS_SAB;
            } else { // Sunday
                moldesDisponiblesHoy = 0;
            }

            if (moldesDisponiblesHoy > 0) {
                // Process items strictly by the pre-sorted order (premium -> created_at)
                for (const queueItem of queueSnapshot) {
                    const simItem = itemsToProcess.get(queueItem.queue_id);

                    // Skip if item not found, already finished, or no molds left today
                    if (!simItem || simItem.sim_qty_pendiente <= 0) continue;
                    if (moldesDisponiblesHoy <= 0) break;

                    // Set start date on the first day of production for this item
                    if (!simItem.sim_eta_start_date) {
                        simItem.sim_eta_start_date = new Date(currentDate);
                        console.log(`  Sim [${formatDate(currentDate)}]: Item ${simItem.queue_id} (P${simItem.product_id}) starting.`);
                    }

                    const vueltas = Math.max(1, simItem.vueltas_max_dia); // Ensure at least 1 vuelta
                    // Calculate max items this specific product can produce per mold today
                    const maxItemsPerMold = vueltas;
                    // Calculate molds needed assuming full vueltas for remaining qty
                    const moldsNeeded = Math.ceil(simItem.sim_qty_pendiente / maxItemsPerMold);
                    // How many molds can we actually assign to this item today?
                    const moldsAssigned = Math.min(moldsNeeded, moldesDisponiblesHoy);

                    // How many items can be produced with the assigned molds and vueltas?
                    const qtyProducedToday = Math.min(simItem.sim_qty_pendiente, moldsAssigned * maxItemsPerMold);

                    if (qtyProducedToday > 0) {
                        simItem.sim_qty_pendiente -= qtyProducedToday;
                        moldesDisponiblesHoy -= moldsAssigned; // Reduce global molds
                        simItem.sim_days_in_production = (simItem.sim_days_in_production || 0) + 1;
                         console.log(`  Sim [${formatDate(currentDate)}]: Item ${simItem.queue_id} (P${simItem.product_id}) produced ${qtyProducedToday} (rem ${simItem.sim_qty_pendiente}), used ${moldsAssigned} molds. Global left: ${moldesDisponiblesHoy}`);
                    }

                    // Check if finished
                    if (simItem.sim_qty_pendiente <= 0) {
                        simItem.sim_eta_end_date = new Date(currentDate); // Finished today
                        remainingItemsCount--;
                        console.log(`  Sim [${formatDate(currentDate)}]: Item ${simItem.queue_id} (P${simItem.product_id}) FINISHED. ${remainingItemsCount} items left.`);
                        // Store final result for this item
                         simulationResults.set(simItem.queue_id, {
                             item: simItem, // Keep the simulation state
                             startDate: simItem.sim_eta_start_date,
                             endDate: simItem.sim_eta_end_date
                         });
                    }
                }
            }

            // Move to the next day
            currentDate.setDate(currentDate.getDate() + 1);
        } // End while loop

        if (simulationDay >= MAX_SIMULATION_DAYS) {
             console.warn(`[_runSimulation] Simulation stopped after ${MAX_SIMULATION_DAYS} days. ${remainingItemsCount} items might be unfinished.`);
        }

         // Ensure items that started but didn't finish get a result entry (with null end date)
         itemsToProcess.forEach(simItem => {
             if (simItem.sim_qty_pendiente > 0 && !simulationResults.has(simItem.queue_id)) {
                 simulationResults.set(simItem.queue_id, {
                     item: simItem,
                     startDate: simItem.sim_eta_start_date,
                     endDate: null // Indicate it didn't finish within simulation time
                 });
             }
         });


        console.log(`[_runSimulation] Simulation finished in ${simulationDay} days. Processed ${simulationResults.size} items.`);
        return simulationResults;
    }


    async calculateETA(
        productId: number,
        qty: number,
        isPremium: boolean,
        vueltasMaxDia: number
    ): Promise<ETAResult> {
        console.log(`[calculateETA] Product ${productId}, Qty ${qty}, Premium: ${isPremium}, Vueltas: ${vueltasMaxDia}`);
        const currentQueue = await this._fetchQueueForSimulation();

        // Create a temporary item representing the new order
        const tempItemId = -1; // Special ID for temporary item
        const tempItem: QueueItem = {
            queue_id: tempItemId,
            cotizacion_producto_id: -1, // Not relevant for calculation
            product_id: productId,
            qty_total: qty,
            qty_pendiente: qty,
            premium: isPremium,
            created_at: new Date().toISOString(), // Represents "now"
            vueltas_max_dia: vueltasMaxDia,
            // Simulation state will be added in _runSimulation
        };

        // Create the queue snapshot for simulation, adding the temp item
        let simulationSnapshot = [...currentQueue, tempItem];

        // Sort the snapshot: Premium first, then by creation date
        simulationSnapshot.sort((a, b) => {
            if (a.premium !== b.premium) {
                return a.premium ? -1 : 1; // true comes first
            }
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        // Run the simulation
        const simulationResults = this._runSimulation(simulationSnapshot);

        // Extract the result for our temporary item
        const resultForTempItem = simulationResults.get(tempItemId);

        if (!resultForTempItem || !resultForTempItem.startDate || !resultForTempItem.endDate) {
            console.error("[calculateETA] Simulation failed to produce dates for the temporary item:", resultForTempItem);
            // Provide a default/error result or throw
            throw new Error("Failed to calculate ETA due to simulation error.");
        }

        console.log("[calculateETA] Simulation result for temp item:", resultForTempItem);

        // Calculate final numbers based on simulation dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const simStartDate = resultForTempItem.startDate;
        const simEndDate = resultForTempItem.endDate;

        // Days waiting = Business days from today until production starts
        const diasEspera = diffBusinessDays(today, simStartDate);
        // Days vaciado = Business days duration of production (inclusive)
        const diasVaciado = diffBusinessDays(simStartDate, simEndDate);

        const fechaFinVaciado = simEndDate;
        const fechaFinPostVaciado = addBusinessDays(fechaFinVaciado, DIAS_POST_VACIADO);
        const fechaEntregaEstimada = addBusinessDays(fechaFinPostVaciado, DIAS_ENVIO);

        const diasTotales = diasEspera + diasVaciado + DIAS_POST_VACIADO + DIAS_ENVIO;
        // Use 5 days for week calculation as per Mon-Fri business days
        const semanasMin = Math.ceil(diasTotales / DIAS_LABORABLES_SEMANA);
        const semanasMax = semanasMin + 2; // Standard 2-week buffer

        return {
            dias_espera_moldes: diasEspera,
            dias_vaciado: diasVaciado,
            dias_post_vaciado: DIAS_POST_VACIADO,
            dias_envio: DIAS_ENVIO,
            dias_totales: diasTotales,
            semanas_min: semanasMin,
            semanas_max: semanasMax,
            fecha_inicio_vaciado: formatDate(simStartDate),
            fecha_fin_vaciado: formatDate(fechaFinVaciado),
            fecha_entrega_estimada: formatDate(fechaEntregaEstimada),
        };
    }


    async addToQueueAndCalculateDates(
        cotizacionProductoId: number,
        productId: number,
        qty: number,
        isPremium: boolean,
        vueltasMaxDia: number // Passed from API route after fetching
    ): Promise<{ eta_start_date: string | null; eta_end_date: string | null }> {
        console.log(`[addToQueue] Item cProdId ${cotizacionProductoId}, ProdId ${productId}, Qty ${qty}, Premium ${isPremium}`);

        // 1. Insert the new item into the actual queue
        const { data: newItemData, error: insertError } = await this.supabase
            .from('production_queue')
            .insert({
                cotizacion_producto_id: cotizacionProductoId,
                producto_id: productId,
                qty_total: qty,
                qty_pendiente: qty,
                premium: isPremium,
                status: 'queued',
                // created_at defaults to now() in DB
                // eta dates initially null
            })
            .select('queue_id, created_at') // Get the generated ID and creation time
            .single();

        if (insertError || !newItemData) {
            console.error('Error inserting item into production queue:', insertError);
            throw new Error(`Failed to add item to production queue: ${insertError?.message}`);
        }

        console.log(`[addToQueue] Item inserted with queue_id: ${newItemData.queue_id}, created_at: ${newItemData.created_at}`);
        const newQueueId = newItemData.queue_id;

        // 2. Recalculate ETAs for the *entire* queue
        const fullQueue = await this._fetchQueueForSimulation(); // Fetch includes the new item now
        const simulationResults = this._runSimulation(fullQueue);

        // 3. Prepare updates for the database
        const updates: Array<Partial<QueueItem> & { queue_id: number }> = [];
        simulationResults.forEach((result, queue_id) => {
            updates.push({
                queue_id: queue_id,
                eta_start_date: formatDate(result.startDate),
                eta_end_date: formatDate(result.endDate)
            });
        });

        console.log(`[addToQueue] Preparing to update ${updates.length} queue items with simulation results.`);

        // 4. Update the database using upsert (or individual updates if needed)
        // Using multiple updates might be safer than upsert if columns differ
        let updateErrorOccurred = false;
        for (const update of updates) {
             const { error: updateError } = await this.supabase
                 .from('production_queue')
                 .update({
                     eta_start_date: update.eta_start_date,
                     eta_end_date: update.eta_end_date,
                     // Potentially update status based on dates? e.g., 'in_progress' if start date is today/past
                 })
                 .eq('queue_id', update.queue_id);

             if (updateError) {
                 console.error(`[addToQueue] Error updating queue item ${update.queue_id}:`, updateError);
                 updateErrorOccurred = true; // Log and continue, maybe collect failures
             }
         }

        if (updateErrorOccurred) {
             console.warn("[addToQueue] One or more errors occurred while updating queue item ETAs.");
             // Decide on error handling: maybe throw a specific error?
             // For now, we proceed but the state might be inconsistent.
         } else {
            console.log("[addToQueue] Successfully updated all queue item ETAs.")
         }

        // 5. Return the calculated dates for the *newly added* item
        const resultForItem = simulationResults.get(newQueueId);
        if (!resultForItem) {
             console.error(`[addToQueue] Failed to find simulation result for the newly added item (queue_id: ${newQueueId}) after simulation.`);
             // This shouldn't happen if the simulation included it
             return { eta_start_date: null, eta_end_date: null };
         }

        return {
            eta_start_date: formatDate(resultForItem.startDate),
            eta_end_date: formatDate(resultForItem.endDate)
        };
    }

    /**
     * Manually triggers a recalculation of the entire queue.
     * Useful if external factors change or after manual status updates.
     */
    async recalculateEntireQueue(): Promise<boolean> {
         console.log("[recalculateEntireQueue] Triggered full queue recalculation...");
         try {
             const fullQueue = await this._fetchQueueForSimulation();
             if (fullQueue.length === 0) {
                 console.log("[recalculateEntireQueue] Queue is empty, nothing to recalculate.");
                 return true;
             }
             const simulationResults = this._runSimulation(fullQueue);

             const updates: Array<Partial<QueueItem> & { queue_id: number }> = [];
             simulationResults.forEach((result, queue_id) => {
                 updates.push({
                     queue_id: queue_id,
                     eta_start_date: formatDate(result.startDate),
                     eta_end_date: formatDate(result.endDate)
                 });
             });

             console.log(`[recalculateEntireQueue] Preparing to update ${updates.length} queue items.`);

             let updateErrorOccurred = false;
             for (const update of updates) {
                 const { error: updateError } = await this.supabase
                     .from('production_queue')
                     .update({
                         eta_start_date: update.eta_start_date,
                         eta_end_date: update.eta_end_date
                     })
                     .eq('queue_id', update.queue_id);

                 if (updateError) {
                     console.error(`[recalculateEntireQueue] Error updating queue item ${update.queue_id}:`, updateError);
                     updateErrorOccurred = true;
                 }
             }

             if (updateErrorOccurred) {
                 console.warn("[recalculateEntireQueue] Recalculation finished with one or more update errors.");
                 return false; // Indicate partial failure
             }

             console.log("[recalculateEntireQueue] Successfully recalculated and updated all queue item ETAs.");
             return true;
         } catch (error) {
             console.error("[recalculateEntireQueue] Failed during recalculation:", error);
             return false;
         }
     }

    /**
     * Adds a new item to the production queue BUT DOES NOT run the simulation yet.
     * Returns the newly created queue item ID.
     */
    async addItemToQueue(
        cotizacionProductoId: number,
        productId: number,
        qty: number,
        isPremium: boolean
    ): Promise<number | null> {
        console.log(`[addItemToQueue] Adding Item: cProdId ${cotizacionProductoId}, ProdId ${productId}, Qty ${qty}, Premium ${isPremium}`);
        const { data: newItemData, error: insertError } = await this.supabase
            .from('production_queue')
            .insert({
                cotizacion_producto_id: cotizacionProductoId,
                producto_id: productId,
                qty_total: qty,
                qty_pendiente: qty,
                premium: isPremium,
                status: 'queued', // Initial status
                // eta_start_date, eta_end_date, vaciado_duration_days are calculated later
            })
            .select('queue_id')
            .single();

        if (insertError) {
            console.error('[addItemToQueue] Error inserting item:', insertError);
            throw new Error(`Failed to add item to production queue: ${insertError.message}`);
        }
        if (!newItemData) {
            console.error('[addItemToQueue] No data returned after insert.');
            throw new Error('Failed to get new queue item ID after insert.');
        }
        console.log(`[addItemToQueue] Item added successfully with queue_id: ${newItemData.queue_id}`);
        return newItemData.queue_id;
    }


    /**
     * Runs the production simulation for ALL 'queued' or 'in_progress' items.
     * Calculates and UPDATES eta_start_date, eta_end_date, and vaciado_duration_days
     * for all affected items directly in the database.
     */
    async calculateGlobalQueueDates(): Promise<{ success: boolean; warnings: string[] }> {
        console.log('[calculateGlobalQueueDates] Starting global queue recalculation...');
        const warnings: string[] = [];
        let simulationDate = new Date(); // Start simulation from today
        // Ensure simulation starts on a weekday if today is weekend
        const currentDay = simulationDate.getDay();
        if (currentDay === 0) { // Sunday
             simulationDate.setDate(simulationDate.getDate() + 1);
        } else if (currentDay === 6) { // Saturday - start calculations next Monday
             simulationDate.setDate(simulationDate.getDate() + 2);
        }
         simulationDate.setHours(0, 0, 0, 0); // Normalize time

        try {
            // 1. Fetch all pending items
            const { data: queueItems, error: fetchError } = await this.supabase
                .from('production_queue')
                .select('*')
                .in('status', ['queued', 'in_progress'])
                .order('created_at', { ascending: true }); // FIFO

            if (fetchError) throw fetchError;
            if (!queueItems || queueItems.length === 0) {
                console.log('[calculateGlobalQueueDates] No pending items found in queue.');
                return { success: true, warnings: [] };
            }

            console.log(`[calculateGlobalQueueDates] Found ${queueItems.length} pending items.`);

            // 2. Fetch product details (vueltas, moldes) for all unique products involved
            const productIds = [...new Set(queueItems.map(item => item.producto_id))];
            const { data: productDetails, error: productFetchError } = await this.supabase
                .from('productos')
                .select('producto_id, vueltas_max_dia, moldes_disponibles')
                .in('producto_id', productIds);

            if (productFetchError) throw productFetchError;

            const productInfoMap = new Map<number, ProductInfo>();
            productDetails?.forEach(p => {
                 if (p.producto_id) {
                     productInfoMap.set(p.producto_id, {
                         vueltas_max_dia: p.vueltas_max_dia ?? 1,
                         moldes_disponibles: p.moldes_disponibles ?? 1 // Default to 1 if null/missing
                     });
                 }
            });
            console.log(`[calculateGlobalQueueDates] Fetched product info for ${productInfoMap.size} products.`);


            // --- Simulation Setup ---
            let itemsInProgress: ProductionQueueItem[] = queueItems.map(item => ({
                ...item, // Original data
                 qty_pendiente: item.qty_total ?? 0, // Reset pending qty for simulation run
                 eta_start_date: null, // Reset dates for simulation run
                 eta_end_date: null,
                 vaciado_duration_days: null,
                 vueltas_max_dia: productInfoMap.get(item.producto_id)?.vueltas_max_dia ?? 1,
                 moldes_disponibles: productInfoMap.get(item.producto_id)?.moldes_disponibles ?? 1,
            }));
            let itemsCompletedInSimulation: ProductionQueueItem[] = [];
            let simulationDayCount = 0; // To prevent infinite loops


            // --- Simulation Loop ---
            while (itemsInProgress.length > 0 && simulationDayCount < 1000) { // Safety break
                simulationDayCount++;
                const dayOfWeek = simulationDate.getDay();

                if (dayOfWeek === 0) { // Skip Sunday
                    simulationDate.setDate(simulationDate.getDate() + 1);
                    continue;
                }

                let effectiveGlobalCapacityToday = (dayOfWeek === 6) ? EFFECTIVE_SAT_CAPACITY : EFFECTIVE_DAILY_CAPACITY;
                let globalSlotsUsedToday = 0;

                 // Prioritize Premium items within the day
                 itemsInProgress.sort((a, b) => {
                     if (a.premium && !b.premium) return -1;
                     if (!a.premium && b.premium) return 1;
                     // Otherwise maintain original FIFO from initial fetch
                     return 0;
                 });

                // Process items for the current day
                for (let i = 0; i < itemsInProgress.length; i++) {
                    const item = itemsInProgress[i];

                    // Fetch product info (handle potential missing info)
                    const info = productInfoMap.get(item.producto_id);
                    if (!info || !info.moldes_disponibles || info.moldes_disponibles <= 0) {
                         warnings.push(`Skipping item ${item.queue_id} due to missing/invalid product info (moldes).`);
                         continue; // Skip processing this item if info is bad
                    }
                    const itemMoldes = info.moldes_disponibles;
                    const itemVueltas = info.vueltas_max_dia;
                    const slotsNeededForItem = itemMoldes;

                    // Check if global capacity allows for this item's molds
                    if (globalSlotsUsedToday + slotsNeededForItem <= effectiveGlobalCapacityToday) {
                         // Record start date if not already set
                        if (!item.eta_start_date) {
                            item.eta_start_date = new Date(simulationDate).toISOString().split('T')[0];
                        }

                        // Calculate potential output based on product molds and vueltas
                        const maxPotentialOutputToday = itemMoldes * itemVueltas;

                        // Determine actual units to produce (limited by pending qty and potential output)
                        const unitsToProduce = Math.min(item.qty_pendiente ?? 0, maxPotentialOutputToday);

                        if (unitsToProduce > 0) {
                             item.qty_pendiente = (item.qty_pendiente ?? 0) - unitsToProduce;
                             globalSlotsUsedToday += slotsNeededForItem; // Consume global slots

                            // Check if item completed
                            if (item.qty_pendiente <= 0) {
                                item.eta_end_date = new Date(simulationDate).toISOString().split('T')[0];
                                // Calculate duration
                                if (item.eta_start_date && item.eta_end_date) {
                                    item.vaciado_duration_days = diffBusinessDays(new Date(item.eta_start_date), new Date(item.eta_end_date)) + 1; // Inclusive
                                }
                                itemsCompletedInSimulation.push(item);
                                // Remove from inProgress (careful with loop index - iterating backwards is safer)
                                // We will filter later instead for simplicity here
                            }
                        }
                    } else {
                        // Not enough global capacity for this item today, try next item or next day
                        continue;
                    }
                 } // End loop through items for the day

                 // Remove completed items from inProgress list for next day
                 itemsInProgress = itemsInProgress.filter(item => (item.qty_pendiente ?? 0) > 0);

                 // Advance simulation date to the next day
                 simulationDate.setDate(simulationDate.getDate() + 1);
            } // End while loop (simulation days)

            if (simulationDayCount >= 1000) {
                warnings.push("Simulation stopped after 1000 days to prevent infinite loop.");
            }
            console.log(`[calculateGlobalQueueDates] Simulation finished after ${simulationDayCount} days.`);

            // --- Update Database ---
            const updates: Promise<any>[] = [];
            itemsCompletedInSimulation.forEach(item => {
                 console.log(`[calculateGlobalQueueDates] Updating DB for completed item ${item.queue_id}: Start=${item.eta_start_date}, End=${item.eta_end_date}, Duration=${item.vaciado_duration_days}`);
                updates.push(
                    this.supabase.from('production_queue').update({
                        eta_start_date: item.eta_start_date,
                        eta_end_date: item.eta_end_date,
                        qty_pendiente: 0, // Ensure it's 0
                        status: 'queued', // Keep as queued until explicitly moved to in_progress/done later? Or set to 'calculated'? Let's keep 'queued' for now.
                        vaciado_duration_days: item.vaciado_duration_days
                    }).eq('queue_id', item.queue_id)
                );
            });
            // Also update items potentially started but not finished?
            // For now, only updating completed items with dates.

            await Promise.all(updates);
            console.log(`[calculateGlobalQueueDates] ${updates.length} completed items updated in DB.`);

            return { success: true, warnings };

        } catch (error: any) {
            console.error('[calculateGlobalQueueDates] Error during simulation:', error);
            warnings.push(`Simulation failed: ${error.message}`);
            return { success: false, warnings };
        }
    }


     /**
      * Recalculates the entire queue and updates associated cotizaciones.
      * Should be called when an item is finished/cancelled or context changes.
      * NOTE: This can be resource intensive.
      */
     async recalculateEntireQueueAndUpdateCotizaciones(): Promise<{ success: boolean; warnings: string[] }> {
         console.log('[recalculateEntireQueueAndUpdateCotizaciones] Starting full recalculation...');
         const { success: calcSuccess, warnings } = await this.calculateGlobalQueueDates();

         if (!calcSuccess) {
             console.error('[recalculateEntireQueueAndUpdateCotizaciones] Failed to calculate global queue dates.');
             return { success: false, warnings };
         }
         console.log('[recalculateEntireQueueAndUpdateCotizaciones] Global dates calculated. Now updating Cotizaciones...');

         // Now, update the estimated_delivery_date on each affected cotizacion
         try {
            // Fetch all queue items with calculated end dates and their cotizacion_id
            const { data: queueItems, error: fetchItemsError } = await this.supabase
                .from('production_queue')
                .select('queue_id, cotizacion_producto_id, eta_end_date')
                .not('eta_end_date', 'is', null); // Only those with calculated dates

            if (fetchItemsError) throw fetchItemsError;
            if (!queueItems || queueItems.length === 0) {
                 console.log('[recalculateEntireQueueAndUpdateCotizaciones] No queue items with end dates found to update cotizaciones.');
                 return { success: true, warnings };
            }

             // Fetch cotizacion_id for each cotizacion_producto_id
             const cpIds = queueItems.map(qi => qi.cotizacion_producto_id);
             const { data: cpLinks, error: fetchCpLinksError } = await this.supabase
                 .from('cotizacion_productos')
                 .select('cotizacion_producto_id, cotizacion_id')
                 .in('cotizacion_producto_id', cpIds);

             if (fetchCpLinksError) throw fetchCpLinksError;
             if (!cpLinks) throw new Error("Failed to fetch cotizacion_producto links.");

             const cpToCotizacionMap = new Map<number, number>();
             cpLinks.forEach(link => {
                 if (link.cotizacion_id) cpToCotizacionMap.set(link.cotizacion_producto_id, link.cotizacion_id);
             });

             // Group latest eta_end_date by cotizacion_id
             const latestEndDateByCotizacion = new Map<number, Date>();
             queueItems.forEach(item => {
                 const cotizacionId = cpToCotizacionMap.get(item.cotizacion_producto_id);
                 if (cotizacionId && item.eta_end_date) {
                     const currentEndDate = new Date(item.eta_end_date);
                     const existingLatest = latestEndDateByCotizacion.get(cotizacionId);
                     if (!existingLatest || currentEndDate > existingLatest) {
                         latestEndDateByCotizacion.set(cotizacionId, currentEndDate);
                     }
                 }
             });

             // Update each cotizacion
             const POST_PROCESSING_DAYS = 3;
             const SHIPPING_DAYS = 3;
             const cotizacionUpdates: Promise<any>[] = [];

             latestEndDateByCotizacion.forEach((latestEndDate, cotizacionId) => {
                 let deliveryDate = addBusinessDays(latestEndDate, POST_PROCESSING_DAYS);
                 deliveryDate = addBusinessDays(deliveryDate, SHIPPING_DAYS);
                 const finalDeliveryDateStr = deliveryDate.toISOString().split('T')[0];
                 console.log(`[recalculateEntireQueueAndUpdateCotizaciones] Updating Cotizacion ${cotizacionId} final ETA to ${finalDeliveryDateStr}`);
                 cotizacionUpdates.push(
                     this.supabase.from('cotizaciones')
                         .update({ estimated_delivery_date: finalDeliveryDateStr })
                         .eq('cotizacion_id', cotizacionId)
                 );
             });

             await Promise.all(cotizacionUpdates);
             console.log(`[recalculateEntireQueueAndUpdateCotizaciones] ${cotizacionUpdates.length} cotizaciones updated with final ETAs.`);
             return { success: true, warnings };

         } catch (error: any) {
             console.error('[recalculateEntireQueueAndUpdateCotizaciones] Error updating cotizaciones:', error);
             warnings.push(`Failed to update cotizaciones after recalculation: ${error.message}`);
             return { success: false, warnings };
         }
     }

} 