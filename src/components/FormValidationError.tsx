import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FormValidationErrorProps {
  errors: string[];
  visible: boolean;
}

/**
 * Componente para mostrar erros de validação
 */
export const FormValidationError: React.FC<FormValidationErrorProps> = ({ errors, visible }) => {
  if (!visible || errors.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <ul className="ml-2 list-disc">
          {errors.map((error, idx) => (
            <li key={idx} className="text-sm">
              {error}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
};
