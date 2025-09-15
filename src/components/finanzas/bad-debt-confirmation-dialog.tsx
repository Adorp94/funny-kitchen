"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface BadDebtConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  quotationFolio: string;
  clientName: string;
  amount: string;
  isLoading: boolean;
}

export function BadDebtConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  quotationFolio,
  clientName,
  amount,
  isLoading
}: BadDebtConfirmationDialogProps) {
  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Marcar como Deuda Incobrable
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="font-medium text-red-800 mb-3">
              ¿Está seguro que desea marcar como incobrable?
            </p>
            <div className="space-y-2 text-red-700 text-sm">
              <div><strong>Cotización:</strong> {quotationFolio}</div>
              <div><strong>Cliente:</strong> {clientName}</div>
              <div><strong>Saldo pendiente:</strong> {amount}</div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-yellow-800 text-sm">
              ⚠️ Esta acción removerá la cotización de cuentas por cobrar sin afectar los pagos registrados.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? "Procesando..." : "Marcar como Incobrable"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}