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
    moldes_disponibles_producto: number;
    assigned_molds: number;
    vaciado_duration_days: number | null;
    eta_start_date?: Date | string | null;
    eta_end_date?: Date | string | null;
    // --- Simulation-specific state ---
    sim_qty_pendiente?: number;
    sim_eta_start_date?: Date | null;
    sim_eta_end_date?: Date | null;
    sim_days_in_production?: number;
    sim_is_active_in_simulation?: boolean; // New flag for active items
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

    private _calculateVaciadoDurationDays(qtyTotal: number, assignedMolds: number): number {
        if (assignedMolds <= 0) {
            // Avoid division by zero or non-sensical results; return a large number or throw error
            // For now, let's assume assignedMolds is validated to be > 0 before calling this.
            console.warn("[_calculateVaciadoDurationDays] assignedMolds is 0 or less, returning high duration.");
            return 999; 
        }
        // Formula from VBA: Ceiling((qty_total / assigned_molds) * 1.08, 1) + 5
        const duration = Math.ceil((qtyTotal / assignedMolds) * 1.08) + 5;
        return duration;
    }

    // Fetches queue items ready for simulation, joins to get product capabilities
    private async _fetchQueueForSimulation(): Promise<QueueItem[]> {
        const { data, error } = await this.supabase
            .from('production_queue')
            .select(`
                *,
                cotizacion_productos!inner (
                    producto_id,
                    productos!inner ( vueltas_max_dia, moldes_disponibles ) 
                )
            `)
            .in('status', ['queued', 'in_progress'])
            .order('premium', { ascending: false })
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching production queue for simulation:', error);
            throw new Error('Failed to fetch production queue.');
        }

        const queueItems: QueueItem[] = data.map((item: any) => {
             const producto = item.cotizacion_productos?.productos;
             return {
                 queue_id: item.queue_id,
                 cotizacion_producto_id: item.cotizacion_producto_id,
                 product_id: item.cotizacion_productos?.producto_id,
                 qty_total: item.qty_total,
                 qty_pendiente: item.qty_pendiente,
                 premium: item.premium,
                 created_at: item.created_at,
                 // Product capabilities:
                 vueltas_max_dia: producto?.vueltas_max_dia ?? 1,
                 moldes_disponibles_producto: producto?.moldes_disponibles ?? 1,
                 // Item specific:
                 assigned_molds: item.assigned_molds ?? 1, // Default if null, though DB has NOT NULL DEFAULT 1
                 vaciado_duration_days: item.vaciado_duration_days, // Should be populated by API or recalculate
                 eta_start_date: item.eta_start_date,
                 eta_end_date: item.eta_end_date,
                 // status: item.status // if needed
             };
         }).filter(item => item.product_id != null);

        console.log(`[_fetchQueueForSimulation] Fetched ${queueItems.length} items for simulation.`);
        return queueItems;
    }


    // Core simulation logic - takes a snapshot of queue items
    private _runSimulation(queueSnapshot: QueueItem[]): Map<number, SimulationResult> {
        console.log(`[_runSimulation] Starting simulation for ${queueSnapshot.length} items.`);
        const simulationResults = new Map<number, SimulationResult>();
        
        // Initialize simulation state for each item
        // Sort by premium then created_at to process in order of priority
        const itemsToProcess = queueSnapshot.sort((a, b) => {
            if (a.premium && !b.premium) return -1;
            if (!a.premium && b.premium) return 1;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }).map(item => ({
            ...item,
            sim_qty_pendiente: item.qty_total, // Production is for the whole qty
            sim_eta_start_date: null,
            sim_eta_end_date: null,
            sim_days_in_production: 0,
            sim_is_active_in_simulation: false,
            // Ensure vaciado_duration_days is available and valid
            vaciado_duration_days: item.vaciado_duration_days && item.vaciado_duration_days > 0 
                                   ? item.vaciado_duration_days 
                                   : this._calculateVaciadoDurationDays(item.qty_total, item.assigned_molds || 1)
        }));

        let currentDate = new Date(); // Or a specific start date for simulation if needed
        currentDate.setHours(0, 0, 0, 0);
        
        let remainingItemsToComplete = itemsToProcess.filter(item => item.sim_qty_pendiente > 0).length;

        const MAX_SIMULATION_DAYS = 365 * 3; // Safety break: 3 years
        let simulationDayCounter = 0;

        console.log(`[_runSimulation] Initial items to complete: ${remainingItemsToComplete}`);

        while (remainingItemsToComplete > 0 && simulationDayCounter < MAX_SIMULATION_DAYS) {
            simulationDayCounter++;
            const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
            let moldesDisponiblesHoy = 0;

            if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday - Friday
                moldesDisponiblesHoy = MOLDS_LUN_VIE;
            } else if (dayOfWeek === 6) { // Saturday
                moldesDisponiblesHoy = MOLDS_SAB;
            } else { // Sunday - 0 molds, but still advance day for active items
                moldesDisponiblesHoy = 0;
            }
            
            // console.log(`\nSim Day ${simulationDayCounter} (${formatDate(currentDate)}, Day ${dayOfWeek}), Capacity: ${moldesDisponiblesHoy}`);

            // 1. Process ACTIVE items: increment their production days, check for completion
            for (const simItem of itemsToProcess) {
                if (simItem.sim_is_active_in_simulation && simItem.sim_qty_pendiente > 0) {
                    if (moldesDisponiblesHoy >= 0) { // Even on Sundays/0-mold days, production day counts
                        simItem.sim_days_in_production = (simItem.sim_days_in_production || 0) + 1;
                        // console.log(`  Active: Item ${simItem.queue_id} (P${simItem.product_id}) now at ${simItem.sim_days_in_production}/${simItem.vaciado_duration_days} days.`);
                    }

                    if (simItem.sim_days_in_production >= simItem.vaciado_duration_days) {
                        simItem.sim_eta_end_date = new Date(currentDate);
                        simItem.sim_qty_pendiente = 0;
                        simItem.sim_is_active_in_simulation = false; // No longer actively uses molds from tomorrow
                        remainingItemsToComplete--;
                        console.log(`  COMPLETED: Item ${simItem.queue_id} (P${simItem.product_id}) finished on ${formatDate(currentDate)}. Remaining items: ${remainingItemsToComplete}`);
                        simulationResults.set(simItem.queue_id, {
                            item: simItem, // Store the original item for reference if needed
                            startDate: simItem.sim_eta_start_date,
                            endDate: simItem.sim_eta_end_date,
                        });
                    }
                }
            }
            
            // 2. Try to START NEW items based on priority and available capacity *for today*
            if (moldesDisponiblesHoy > 0) {
                for (const simItem of itemsToProcess) {
                    if (simItem.sim_qty_pendiente > 0 && !simItem.sim_is_active_in_simulation && !simItem.sim_eta_start_date) {
                        if (moldesDisponiblesHoy >= simItem.assigned_molds) {
                            simItem.sim_eta_start_date = new Date(currentDate);
                            simItem.sim_is_active_in_simulation = true;
                            moldesDisponiblesHoy -= simItem.assigned_molds;
                            // First day of production also counts towards sim_days_in_production
                            simItem.sim_days_in_production = (simItem.sim_days_in_production || 0) + 1; 
                            console.log(`  STARTED: Item ${simItem.queue_id} (P${simItem.product_id}) using ${simItem.assigned_molds} molds. Capacity left: ${moldesDisponiblesHoy}. Duration: ${simItem.vaciado_duration_days} days.`);
                            
                            // Check for immediate completion if duration is 1 day
                            if (simItem.sim_days_in_production >= simItem.vaciado_duration_days) {
                                simItem.sim_eta_end_date = new Date(currentDate);
                                simItem.sim_qty_pendiente = 0;
                                simItem.sim_is_active_in_simulation = false;
                                remainingItemsToComplete--;
                                console.log(`  COMPLETED (1-day): Item ${simItem.queue_id} (P${simItem.product_id}) finished on ${formatDate(currentDate)}. Remaining items: ${remainingItemsToComplete}`);
                                simulationResults.set(simItem.queue_id, {
                                    item: simItem,
                                    startDate: simItem.sim_eta_start_date,
                                    endDate: simItem.sim_eta_end_date,
                                });
                            } // end immediate completion check
                        } else {
                            // console.log(`  Skipping start for Item ${simItem.queue_id} (P${simItem.product_id}): needs ${simItem.assigned_molds}, has ${moldesDisponiblesHoy}`);
                        }
                    }
                    if (moldesDisponiblesHoy <= 0) break; // No more capacity for today
                }
            }

            // Advance to the next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        if (simulationDayCounter >= MAX_SIMULATION_DAYS && remainingItemsToComplete > 0) {
            console.warn(`[_runSimulation] Simulation reached MAX_SIMULATION_DAYS (${MAX_SIMULATION_DAYS}) with ${remainingItemsToComplete} items still pending.`);
            // Handle items that didn't finish: record them as not having ETAs or partial ETAs
            itemsToProcess.forEach(simItem => {
                if (simItem.sim_qty_pendiente > 0 && !simulationResults.has(simItem.queue_id)) {
                     simulationResults.set(simItem.queue_id, {
                        item: simItem,
                        startDate: simItem.sim_eta_start_date, // Might have started
                        endDate: null, // But did not finish
                    });
                }
            });
        }
        
        console.log(`[_runSimulation] Finished simulation in ${simulationDayCounter} days. Results collected for ${simulationResults.size} items.`);
        return simulationResults;
    }


    async calculateETA(
        productId: number,
        qty: number,
        isPremium: boolean,
        assignedMoldsForItem: number
    ): Promise<ETAResult> {
        console.log(`[calculateETA] Product ${productId}, Qty ${qty}, Premium: ${isPremium}, Assigned Molds: ${assignedMoldsForItem}`);
        
        if (assignedMoldsForItem <= 0) {
            // If user hasn't specified, or an invalid value is passed, default to 1 for estimation purposes.
            console.warn("[calculateETA] assignedMoldsForItem is 0 or less. Defaulting to 1 for estimation.");
            assignedMoldsForItem = 1;
        }

        const currentQueue = await this._fetchQueueForSimulation();

        // Fetch product capabilities for the item being estimated
        const { data: productData, error: productError } = await this.supabase
            .from('productos')
            .select('moldes_disponibles, vueltas_max_dia') 
            .eq('producto_id', productId)
            .single();

        if (productError || !productData) {
            console.error(`[calculateETA] Error fetching product data for product ${productId}:`, productError);
            throw new Error("Failed to calculate ETA due to missing product data.");
        }

        const moldesDisponiblesProducto = productData.moldes_disponibles ?? 1;
        // Ensure the estimate doesn't use more molds than the product has.
        if (assignedMoldsForItem > moldesDisponiblesProducto) {
            console.warn(`[calculateETA] assignedMoldsForItem (${assignedMoldsForItem}) exceeds product's available molds (${moldesDisponiblesProducto}). Clamping to available molds for estimate.`);
            assignedMoldsForItem = moldesDisponiblesProducto;
        }

        // Create a temporary item representing the new order
        const tempItemId = -1; // Special ID for temporary item
        const tempItemVaciadoDuration = this._calculateVaciadoDurationDays(qty, assignedMoldsForItem);

        const tempItem: QueueItem = {
            queue_id: tempItemId,
            cotizacion_producto_id: -1, 
            product_id: productId,
            qty_total: qty,
            qty_pendiente: qty, // For simulation, initially all is pending
            premium: isPremium,
            created_at: new Date().toISOString(), 
            assigned_molds: assignedMoldsForItem,
            vaciado_duration_days: tempItemVaciadoDuration,
            vueltas_max_dia: productData.vueltas_max_dia ?? 1, // From product data
            moldes_disponibles_producto: moldesDisponiblesProducto, // From product data
            // Fields for simulation state, matching how _runSimulation initializes its items
            eta_start_date: null,
            eta_end_date: null,
            sim_qty_pendiente: qty,
            sim_eta_start_date: null,
            sim_eta_end_date: null,
            sim_days_in_production: 0,
            sim_is_active_in_simulation: false
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


    /**
     * Adds an item to the production queue AND production_active table.
     * This is the missing method that connects cotizaciones to production tracking.
     */
    async addItemToQueue(
        cotizacionProductoId: number,
        productId: number,
        quantity: number,
        isPremium: boolean
    ): Promise<number | null> {
        console.log(`[addItemToQueue] Adding cotizacion_producto_id: ${cotizacionProductoId}, product: ${productId}, qty: ${quantity}, premium: ${isPremium}`);

        try {
            // 1. Add item to production_queue
            const initialAssignedMolds = 1; // Default for new items
            const vaciadoDuration = this._calculateVaciadoDurationDays(quantity, initialAssignedMolds);

            const { data: newQueueItem, error: queueInsertError } = await this.supabase
                .from('production_queue')
                .insert({
                    cotizacion_producto_id: cotizacionProductoId,
                    producto_id: productId,
                    qty_total: quantity,
                    qty_pendiente: quantity,
                    premium: isPremium,
                    status: 'queued',
                    assigned_molds: initialAssignedMolds,
                    vaciado_duration_days: vaciadoDuration,
                })
                .select()
                .single();

            if (queueInsertError || !newQueueItem) {
                console.error('Error inserting item into production_queue:', queueInsertError);
                return null;
            }

            console.log(`[addItemToQueue] Added to production_queue with ID: ${newQueueItem.queue_id}`);

            // 2. CRITICAL: Also add to production_active table so it appears in Bitácora
            // First check if product already exists
            const { data: existingActive, error: checkError } = await this.supabase
                .from('production_active')
                .select('pedidos')
                .eq('producto_id', productId)
                .single();

            let activeInsertError;
            if (checkError && checkError.code === 'PGRST116') {
                // Product doesn't exist, create new
                const { error } = await this.supabase
                    .from('production_active')
                    .insert({
                        producto_id: productId,
                        pedidos: quantity,
                        por_detallar: 0,
                        detallado: 0,  
                        sancocho: 0,
                        terminado: 0,
                        updated_at: new Date().toISOString()
                    });
                activeInsertError = error;
                console.log(`[addItemToQueue] Created new production_active entry for product ${productId} with ${quantity} pedidos`);
            } else if (!checkError && existingActive) {
                // Product exists, add to existing pedidos
                const newPedidos = existingActive.pedidos + quantity;
                const { error } = await this.supabase
                    .from('production_active')
                    .update({
                        pedidos: newPedidos,
                        updated_at: new Date().toISOString()
                    })
                    .eq('producto_id', productId);
                activeInsertError = error;
                console.log(`[addItemToQueue] Updated production_active for product ${productId}: ${existingActive.pedidos} + ${quantity} = ${newPedidos} pedidos`);
            } else {
                activeInsertError = checkError;
            }

            if (activeInsertError) {
                console.error('Error updating production_active:', activeInsertError);
                // If production_active insertion fails, we could optionally rollback the queue insertion
                // For now, just log the error and continue
            }

            return newQueueItem.queue_id;

        } catch (error) {
            console.error('Error in addItemToQueue:', error);
            return null;
        }
    }

    async addToQueueAndCalculateDates(
        cotizacionProductoId: number,
        productId: number,
        qty: number,
        isPremium: boolean
        // vueltasMaxDia parameter is removed as it's now part of product capabilities fetched or less directly used
        // assigned_molds will default to 1 on insert, vaciado_duration_days will be calculated
    ): Promise<{ eta_start_date: string | null; eta_end_date: string | null; final_delivery_date: string | null }> {
        console.log(`[addToQueueAndCalculateDates] For cotizacion_producto_id: ${cotizacionProductoId}, product: ${productId}, qty: ${qty}, premium: ${isPremium}`);

        // 1. Add item to queue with default assigned_molds and calculated vaciado_duration_days
        const initialAssignedMolds = 1; // Default for new items
        const vaciadoDuration = this._calculateVaciadoDurationDays(qty, initialAssignedMolds);

        const { data: newQueueItem, error: insertError } = await this.supabase
            .from('production_queue')
            .insert({
                cotizacion_producto_id: cotizacionProductoId,
                qty_total: qty,
                qty_pendiente: qty,
                premium: isPremium,
                status: 'queued',
                assigned_molds: initialAssignedMolds,
                vaciado_duration_days: vaciadoDuration,
                // eta_start_date and eta_end_date will be set by recalculateEntireQueue
            })
            .select()
            .single();

        if (insertError || !newQueueItem) {
            console.error('Error inserting item into production_queue:', insertError);
            throw new Error('Failed to add item to production queue.');
        }
        console.log(`[addToQueueAndCalculateDates] Inserted new queue item ID: ${newQueueItem.queue_id} with duration ${vaciadoDuration} days.`);

        // 2. Recalculate the entire queue to update ETAs for all items
        // This operation is now more complex and critical.
        // It needs to consider assigned_molds and the new vaciado_duration_days calculation.
        try {
            await this.recalculateEntireQueue(); // This will update ETAs in the DB
            
            // Fetch the updated item to get its new ETAs
            const { data: updatedItem, error: fetchError } = await this.supabase
                .from('production_queue')
                .select('eta_start_date, eta_end_date')
                .eq('queue_id', newQueueItem.queue_id)
                .single();

            if (fetchError || !updatedItem) {
                console.error('Error fetching updated ETAs for new queue item:', fetchError);
                // Return nulls or throw, but the item is in queue. Recalc might run in background.
                return { eta_start_date: null, eta_end_date: null, final_delivery_date: null };
            }
            
            let finalDeliveryDate: Date | null = null;
            if (updatedItem.eta_end_date) {
                let tempEndDate = new Date(updatedItem.eta_end_date);
                tempEndDate = addBusinessDays(tempEndDate, DIAS_POST_VACIADO); // Add post-processing
                finalDeliveryDate = addBusinessDays(tempEndDate, DIAS_ENVIO); // Add shipping
            }


            console.log(`[addToQueueAndCalculateDates] Recalculated queue. New item ${newQueueItem.queue_id} ETAs: Start ${updatedItem.eta_start_date}, End ${updatedItem.eta_end_date}, Final Delivery: ${formatDate(finalDeliveryDate)}`);
            return { 
                eta_start_date: updatedItem.eta_start_date, 
                eta_end_date: updatedItem.eta_end_date,
                final_delivery_date: formatDate(finalDeliveryDate)
            };

        } catch (recalcError) {
            console.error('Error during recalculateEntireQueue after adding item:', recalcError);
            // Item is added, but ETAs might be stale. Consider how to handle this.
            // Maybe return the initially calculated duration or nulls for ETA.
             return { eta_start_date: null, eta_end_date: null, final_delivery_date: null };
        }
    }

    // Recalculates ETAs for all relevant items in the queue and updates the database.
    async recalculateEntireQueue(): Promise<boolean> {
        console.log("[recalculateEntireQueue] Starting full queue recalculation...");
        let allItemsInQueueForSim: QueueItem[];
        try {
            allItemsInQueueForSim = await this._fetchQueueForSimulation();
        } catch (error) {
            console.error("[recalculateEntireQueue] Failed to fetch queue for simulation:", error);
            return false;
        }

        if (allItemsInQueueForSim.length === 0) {
            console.log("[recalculateEntireQueue] No items to simulate.");
            return true;
        }

        // Run the simulation logic
        const simulationResults = this._runSimulation(allItemsInQueueForSim);

        // Prepare updates for the database
        const updates: Array<Partial<ProductionQueueItem> & { queue_id: number }> = [];
        simulationResults.forEach((result, queue_id) => {
            updates.push({
                queue_id: queue_id,
                eta_start_date: formatDate(result.startDate),
                eta_end_date: formatDate(result.endDate),
                // Update status based on simulation results if necessary
                // For example, if eta_start_date is set and in past/present, status could be 'in_progress'
                // If eta_end_date is set and in past, status could be 'done' (though PATCH handler also does this)
                // For now, let's just update dates. Status is handled by PATCH or manual updates.
                qty_pendiente: result.item.sim_qty_pendiente, // Update pending quantity based on simulation
                // vaciado_duration_days could also be updated if it was re-calculated in _runSimulation init
                vaciado_duration_days: result.item.vaciado_duration_days 
            });
        });

        if (updates.length === 0) {
            console.log("[recalculateEntireQueue] No updates to apply after simulation.");
            return true;
        }
        
        console.log(`[recalculateEntireQueue] Preparing to update ${updates.length} queue items with new ETAs.`);

        let success = true;
        // Batch updates or individual updates
        for (const update of updates) {
            const { error: updateError } = await this.supabase
                .from('production_queue')
                .update({
                    eta_start_date: update.eta_start_date,
                    eta_end_date: update.eta_end_date,
                    qty_pendiente: update.qty_pendiente,
                    vaciado_duration_days: update.vaciado_duration_days,
                    // Only update status if it makes sense from a full recalc perspective
                    // e.g., if an item is now done based on simulation.
                    status: update.qty_pendiente === 0 && update.eta_end_date ? 'done' : 
                           (update.eta_start_date ? 'in_progress' : 'queued')
                })
                .eq('queue_id', update.queue_id);

            if (updateError) {
                console.error(`[recalculateEntireQueue] Error updating queue item ${update.queue_id}:`, updateError);
                success = false; // Mark as failed but continue trying other updates
            }
        }

        if (success) {
            console.log("[recalculateEntireQueue] Successfully updated ETAs for all simulated items.");
        } else {
            console.warn("[recalculateEntireQueue] One or more errors occurred while updating queue item ETAs.");
        }
        return success;
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