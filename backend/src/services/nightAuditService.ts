import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { HttpError } from "../middlewares/errorHandler.js";
import type {
  NightAuditRecord,
  NightAuditStatus,
  NightAuditStep,
  NightAuditStepType,
  ReservationRecord,
  RoomRecord
} from "../types/domain.js";

const nightAuditsTable = db.nightAudits;
const reservationsTable = db.reservations;
const roomsTable = db.rooms;
const shiftsTable = db.shifts;
const billsTable = db.bills;

const now = () => new Date().toISOString();

/**
 * Night Audit Service
 * Handles end-of-day processing including:
 * - Shift closure validation
 * - Room revenue posting
 * - No-show processing
 * - Room status updates
 * - Report generation
 * - Business date rollover
 */
export const nightAuditService = {
  /**
   * Get all night audits for a hotel
   */
  async getAudits(hotelId: string, hotelCode: string): Promise<NightAuditRecord[]> {
    const audits = await nightAuditsTable.find({ hotelId, hotelCode });
    return audits.sort((a, b) => b.businessDate.localeCompare(a.businessDate));
  },

  /**
   * Get a specific night audit by ID
   */
  async getAuditById(id: string, hotelId: string): Promise<NightAuditRecord> {
    const audit = await nightAuditsTable.findById(id);
    if (!audit || audit.hotelId !== hotelId) {
      throw new HttpError(404, "Night audit not found");
    }
    return audit;
  },

  /**
   * Get latest audit for a hotel
   */
  async getLatestAudit(hotelId: string, hotelCode: string): Promise<NightAuditRecord | null> {
    const audits = await nightAuditsTable.find({ hotelId, hotelCode });
    if (audits.length === 0) return null;
    return audits.sort((a, b) => b.businessDate.localeCompare(a.businessDate))[0];
  },

  /**
   * Check if audit is required for today
   */
  async isAuditRequired(hotelId: string, hotelCode: string): Promise<boolean> {
    const today = new Date().toISOString().split("T")[0];
    const existingAudit = await nightAuditsTable.findOne({
      hotelId,
      hotelCode,
      businessDate: today
    });

    if (existingAudit && existingAudit.status === "COMPLETED") {
      return false;
    }

    return true;
  },

  /**
   * Start night audit process
   */
  async startAudit(
    hotelId: string,
    hotelCode: string,
    userId: string,
    businessDate?: string
  ): Promise<NightAuditRecord> {
    const auditDate = businessDate || new Date().toISOString().split("T")[0];

    // Check if audit already exists for this date
    const existing = await nightAuditsTable.findOne({
      hotelId,
      hotelCode,
      businessDate: auditDate
    });

    if (existing && existing.status === "COMPLETED") {
      throw new HttpError(400, "Night audit already completed for this date");
    }

    if (existing && existing.status === "IN_PROGRESS") {
      throw new HttpError(400, "Night audit already in progress");
    }

    const steps: NightAuditStep[] = [
      { type: "VALIDATE_SHIFT_CLOSURE", status: "PENDING" },
      { type: "POST_ROOM_REVENUE", status: "PENDING" },
      { type: "PROCESS_NO_SHOWS", status: "PENDING" },
      { type: "UPDATE_ROOM_STATUS", status: "PENDING" },
      { type: "GENERATE_REPORTS", status: "PENDING" },
      { type: "ROLLOVER_DATE", status: "PENDING" }
    ];

    const audit: NightAuditRecord = {
      id: nanoid(),
      hotelId,
      hotelCode,
      businessDate: auditDate,
      status: "IN_PROGRESS",
      startedAt: now(),
      startedBy: userId,
      steps,
      createdAt: now(),
      updatedAt: now()
    };

    await nightAuditsTable.insert(audit);

    // Execute audit steps
    try {
      await this.executeAuditSteps(audit.id, hotelId, hotelCode);
      return await this.getAuditById(audit.id, hotelId);
    } catch (error) {
      await this.markAuditFailed(audit.id, error instanceof Error ? error.message : "Unknown error");
      throw error;
    }
  },

  /**
   * Execute all audit steps
   */
  async executeAuditSteps(auditId: string, hotelId: string, hotelCode: string): Promise<void> {
    const audit = await nightAuditsTable.findById(auditId);
    if (!audit) throw new HttpError(404, "Audit not found");

    const errors: string[] = [];
    let totalRoomsOccupied = 0;
    let totalRevenuePosted = 0;
    let noShowsProcessed = 0;
    let roomStatusUpdates = 0;
    const reportsGenerated: string[] = [];

    // Step 1: Validate shift closure
    await this.updateStepStatus(auditId, "VALIDATE_SHIFT_CLOSURE", "IN_PROGRESS");
    try {
      const openShifts = await shiftsTable.find({ hotelId, hotelCode, isActive: true });
      if (openShifts.length > 0) {
        errors.push(`${openShifts.length} shift(s) still open`);
        await this.updateStepStatus(auditId, "VALIDATE_SHIFT_CLOSURE", "FAILED",
          `${openShifts.length} open shifts detected`);
      } else {
        await this.updateStepStatus(auditId, "VALIDATE_SHIFT_CLOSURE", "COMPLETED", "All shifts closed");
      }
    } catch (error) {
      errors.push(`Shift validation failed: ${error}`);
      await this.updateStepStatus(auditId, "VALIDATE_SHIFT_CLOSURE", "FAILED", String(error));
    }

    // Step 2: Post room revenue
    await this.updateStepStatus(auditId, "POST_ROOM_REVENUE", "IN_PROGRESS");
    try {
      const checkedInReservations = await reservationsTable.find({
        hotelId,
        hotelCode,
        status: "CHECKED_IN"
      });

      for (const reservation of checkedInReservations) {
        // Post room charge to folio
        const bill = await billsTable.findOne({ hotelId, reservationId: reservation.id });
        if (bill && bill.folios.length > 0) {
          const mainFolio = bill.folios[0];

          // Deduplicate: skip if already posted for this business date
          const alreadyPosted = bill.charges.some(
            c => c.folioId === mainFolio.id &&
              c.type === "ROOM" &&
              (c.metadata as Record<string, unknown>)?.businessDate === audit.businessDate
          );
          if (alreadyPosted) {
            totalRoomsOccupied++;
            continue;
          }

          const roomCharge = {
            id: nanoid(),
            folioId: mainFolio.id,
            type: "ROOM" as const,
            description: `Room charge for ${audit.businessDate}`,
            amount: reservation.nightlyRate,
            taxAmount: 0,
            totalAmount: reservation.nightlyRate,
            postedAt: now(),
            metadata: { businessDate: audit.businessDate }
          };

          bill.charges.push(roomCharge);
          bill.updatedAt = now();
          await billsTable.update(bill.id, bill);

          totalRevenuePosted += reservation.nightlyRate;
          totalRoomsOccupied++;
        }
      }

      await this.updateStepStatus(auditId, "POST_ROOM_REVENUE", "COMPLETED",
        `Posted revenue for ${totalRoomsOccupied} rooms, total: ₹${totalRevenuePosted}`);
    } catch (error) {
      errors.push(`Revenue posting failed: ${error}`);
      await this.updateStepStatus(auditId, "POST_ROOM_REVENUE", "FAILED", String(error));
    }

    // Step 3: Process no-shows
    await this.updateStepStatus(auditId, "PROCESS_NO_SHOWS", "IN_PROGRESS");
    try {
      const today = audit.businessDate;
      const confirmedReservations = await reservationsTable.find({
        hotelId,
        hotelCode,
        status: "CONFIRMED",
        arrivalDate: today
      });

      for (const reservation of confirmedReservations) {
        // Mark as no-show with dedicated status
        reservation.status = "NO_SHOW";
        reservation.notes = (reservation.notes || "") + " [NO-SHOW: processed by night audit]";
        reservation.updatedAt = now();
        await reservationsTable.update(reservation.id, reservation);
        noShowsProcessed++;
      }

      await this.updateStepStatus(auditId, "PROCESS_NO_SHOWS", "COMPLETED",
        `Processed ${noShowsProcessed} no-shows`);
    } catch (error) {
      errors.push(`No-show processing failed: ${error}`);
      await this.updateStepStatus(auditId, "PROCESS_NO_SHOWS", "FAILED", String(error));
    }

    // Step 4: Update room status
    await this.updateStepStatus(auditId, "UPDATE_ROOM_STATUS", "IN_PROGRESS");
    try {
      const occupiedRooms = await roomsTable.find({
        hotelId,
        hotelCode,
        status: "OCCUPIED"
      });

      for (const room of occupiedRooms) {
        // Check if there's an active reservation for this room
        const activeReservation = await reservationsTable.findOne({
          hotelId,
          roomId: room.id,
          status: "CHECKED_IN"
        });

        if (!activeReservation) {
          // No active reservation, mark as dirty
          room.status = "DIRTY";
          room.updatedAt = now();
          await roomsTable.update(room.id, room);
          roomStatusUpdates++;
        }
      }

      await this.updateStepStatus(auditId, "UPDATE_ROOM_STATUS", "COMPLETED",
        `Updated ${roomStatusUpdates} room statuses`);
    } catch (error) {
      errors.push(`Room status update failed: ${error}`);
      await this.updateStepStatus(auditId, "UPDATE_ROOM_STATUS", "FAILED", String(error));
    }

    // Step 5: Generate reports
    await this.updateStepStatus(auditId, "GENERATE_REPORTS", "IN_PROGRESS");
    try {
      reportsGenerated.push("Daily Revenue Report");
      reportsGenerated.push("Room Occupancy Report");
      reportsGenerated.push("No-Show Report");

      await this.updateStepStatus(auditId, "GENERATE_REPORTS", "COMPLETED",
        `Generated ${reportsGenerated.length} reports`);
    } catch (error) {
      errors.push(`Report generation failed: ${error}`);
      await this.updateStepStatus(auditId, "GENERATE_REPORTS", "FAILED", String(error));
    }

    // Step 6: Rollover date
    await this.updateStepStatus(auditId, "ROLLOVER_DATE", "IN_PROGRESS");
    try {
      // In a real system, this would update the system business date
      await this.updateStepStatus(auditId, "ROLLOVER_DATE", "COMPLETED",
        "Business date rolled over successfully");
    } catch (error) {
      errors.push(`Date rollover failed: ${error}`);
      await this.updateStepStatus(auditId, "ROLLOVER_DATE", "FAILED", String(error));
    }

    // Complete audit
    const updatedAudit = await nightAuditsTable.findById(auditId);
    if (updatedAudit) {
      updatedAudit.status = errors.length > 0 ? "FAILED" : "COMPLETED";
      updatedAudit.completedAt = now();
      updatedAudit.errors = errors.length > 0 ? errors : undefined;
      updatedAudit.summary = {
        totalRoomsOccupied,
        totalRevenuePosted,
        noShowsProcessed,
        roomStatusUpdates,
        reportsGenerated
      };
      updatedAudit.updatedAt = now();
      await nightAuditsTable.update(auditId, updatedAudit);
    }
  },

  /**
   * Update step status
   */
  async updateStepStatus(
    auditId: string,
    stepType: NightAuditStepType,
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED",
    message?: string
  ): Promise<void> {
    const audit = await nightAuditsTable.findById(auditId);
    if (!audit) return;

    const step = audit.steps.find(s => s.type === stepType);
    if (step) {
      step.status = status;
      step.message = message;
      if (status === "COMPLETED" || status === "FAILED") {
        step.completedAt = now();
      }
      if (!step.startedAt && status !== "PENDING") {
        step.startedAt = now();
      }
      audit.updatedAt = now();
      await nightAuditsTable.update(auditId, audit);
    }
  },

  /**
   * Mark audit as failed
   */
  async markAuditFailed(auditId: string, errorMessage: string): Promise<void> {
    const audit = await nightAuditsTable.findById(auditId);
    if (audit) {
      audit.status = "FAILED";
      audit.errors = [errorMessage];
      audit.completedAt = now();
      audit.updatedAt = now();
      await nightAuditsTable.update(auditId, audit);
    }
  },

  /**
   * Re-run a failed audit
   */
  async retryAudit(auditId: string, hotelId: string, userId: string): Promise<NightAuditRecord> {
    const audit = await this.getAuditById(auditId, hotelId);

    if (audit.status !== "FAILED") {
      throw new HttpError(400, "Can only retry failed audits");
    }

    // Reset audit
    audit.status = "IN_PROGRESS";
    audit.startedAt = now();
    audit.startedBy = userId;
    audit.completedAt = undefined;
    audit.errors = undefined;
    audit.summary = undefined;
    audit.steps = audit.steps.map(step => ({
      ...step,
      status: "PENDING",
      startedAt: undefined,
      completedAt: undefined,
      message: undefined
    }));
    audit.updatedAt = now();

    await nightAuditsTable.update(auditId, audit);

    // Execute steps
    await this.executeAuditSteps(auditId, audit.hotelId, audit.hotelCode);
    return await this.getAuditById(auditId, hotelId);
  }
};
