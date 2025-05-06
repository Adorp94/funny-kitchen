import { SupabaseClient } from '@supabase/supabase-js'; // Assuming you use the official client
import { Database } from '@/lib/database.types'; // Import generated types

// --- Constants ---
const MOLDS_LUN_VIE = 270;
const MOLDS_SAB = 135;
const DIAS_POST_VACIADO = 3;
const DIAS_ENVIO = 3;
const DIAS_LABORABLES_SEMANA = 5; // Mon-Fri for week calculation

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

} 