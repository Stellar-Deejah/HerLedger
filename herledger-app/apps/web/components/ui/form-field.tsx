"use client";

import React, { createContext, useContext } from "react";

interface FieldContextValue {
  id: string;
  error?: string | undefined;
  descriptionId?: string | undefined;
  errorId?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
}

const FieldContext = createContext<FieldContextValue | null>(null);

function useFieldContext() {
  const context = useContext(FieldContext);
  if (!context) {
    throw new Error("Field compound components must be used within a <Field.Root>");
  }
  return context;
}

export interface FieldRootProps {
  /** Unique HTML id for the associated input element */
  id: string;
  /** Optional error message */
  error?: string | undefined;
  /** When true, marks the field as required */
  required?: boolean | undefined;
  /** When true, marks the field as disabled */
  disabled?: boolean | undefined;
  /** Child field primitives */
  children: React.ReactNode;
  /** Optional container style */
  style?: React.CSSProperties | undefined;
  /** Optional container class name */
  className?: string | undefined;
}

/**
 * Field.Root creates the contextual boundary for field primitives (id, accessibility descriptors, error state).
 */
export function FieldRoot({
  id,
  error,
  required,
  disabled,
  children,
  style,
  className,
}: FieldRootProps) {
  const descriptionId = `${id}-desc`;
  const errorId = `${id}-error`;

  const contextValue: FieldContextValue = {
    id,
    descriptionId,
    errorId,
  };
  if (error !== undefined) contextValue.error = error;
  if (required !== undefined) contextValue.required = required;
  if (disabled !== undefined) contextValue.disabled = disabled;

  return (
    <FieldContext.Provider value={contextValue}>
      <div
        className={className}
        style={{
          marginBottom: "var(--spacing-lg)",
          ...style,
        }}
      >
        {children}
      </div>
    </FieldContext.Provider>
  );
}

export interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Label text or nested elements */
  children: React.ReactNode;
}

/**
 * Field.Label renders an accessible form label tied to the root field's id.
 */
export function FieldLabel({ children, style, className, ...props }: FieldLabelProps) {
  const { id, required } = useFieldContext();

  return (
    <label
      htmlFor={id}
      className={className}
      style={{
        display: "block",
        fontWeight: "var(--font-weight-medium)",
        fontSize: "var(--font-size-sm)",
        marginBottom: "0.375rem",
        ...style,
      }}
      {...props}
    >
      {children}
      {required && (
        <span
          aria-hidden="true"
          style={{
            color: "var(--color-error)",
            marginLeft: "var(--spacing-xs)",
          }}
        >
          *
        </span>
      )}
    </label>
  );
}

export interface FieldInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  /** Callback triggered when input value changes */
  onChange?: ((value: string) => void) | React.ChangeEventHandler<HTMLInputElement> | undefined;
}

/**
 * Field.Input renders an accessible input element with automated aria-describedby and validation styling.
 */
export function FieldInput({
  type = "text",
  value,
  onChange,
  style,
  className,
  disabled: propDisabled,
  required: propRequired,
  ...props
}: FieldInputProps) {
  const {
    id,
    error,
    descriptionId,
    errorId,
    required: contextRequired,
    disabled: contextDisabled,
  } = useFieldContext();

  const isRequired = propRequired ?? contextRequired;
  const isDisabled = propDisabled ?? contextDisabled;

  const ariaDescribedBy =
    [descriptionId, error ? errorId : undefined].filter(Boolean).join(" ") || undefined;

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (typeof onChange === "function") {
      if (onChange.length === 1) {
        try {
          (onChange as (val: string) => void)(e.target.value);
        } catch {
          (onChange as React.ChangeEventHandler<HTMLInputElement>)(e);
        }
      } else {
        (onChange as React.ChangeEventHandler<HTMLInputElement>)(e);
      }
    }
  };

  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={handleChange}
      required={isRequired}
      disabled={isDisabled}
      aria-describedby={ariaDescribedBy}
      aria-invalid={error ? true : undefined}
      className={className}
      style={{
        width: "100%",
        padding: "var(--spacing-sm) var(--spacing-md)",
        border: `1px solid ${error ? "var(--color-error)" : "var(--border)"}`,
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-size-base)",
        background: isDisabled ? "var(--color-muted-bg)" : "var(--background)",
        color: isDisabled ? "var(--color-muted-text)" : "var(--foreground)",
        boxSizing: "border-box",
        cursor: isDisabled ? "not-allowed" : "text",
        ...style,
      }}
      {...props}
    />
  );
}

export interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Optional custom error text override (defaults to root error) */
  children?: React.ReactNode;
}

/**
 * Field.Error renders an accessible alert message when an error is present.
 */
export function FieldError({ children, style, className, ...props }: FieldErrorProps) {
  const { error, errorId } = useFieldContext();
  const displayError = children ?? error;

  if (!displayError) return null;

  return (
    <p
      id={errorId}
      role="alert"
      className={className}
      style={{
        fontSize: "0.8125rem",
        color: "var(--color-error-text)",
        marginTop: "var(--spacing-xs)",
        marginRight: 0,
        marginBottom: 0,
        marginLeft: 0,
        ...style,
      }}
      {...props}
    >
      {displayError}
    </p>
  );
}

export interface FieldHintProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** Hint or helper text */
  children: React.ReactNode;
}

/**
 * Field.Hint renders helper or description text associated with the input.
 */
export function FieldHint({ children, style, className, ...props }: FieldHintProps) {
  const { error, descriptionId } = useFieldContext();

  // If there's an error, standard UX shows the error in preference or in addition
  if (error || !children) return null;

  return (
    <p
      id={descriptionId}
      className={className}
      style={{
        fontSize: "0.8125rem",
        color: "var(--color-muted-text)",
        marginTop: "var(--spacing-xs)",
        marginRight: 0,
        marginBottom: 0,
        marginLeft: 0,
        ...style,
      }}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * Composable compound Field primitives.
 */
export const Field = {
  Root: FieldRoot,
  Label: FieldLabel,
  Input: FieldInput,
  Error: FieldError,
  Hint: FieldHint,
  Description: FieldHint,
};

export interface FormFieldProps {
  /** Unique element id */
  id: string;
  /** Field label text */
  label: string;
  /** Input type */
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | undefined;
  /** Current string value */
  value: string;
  /** Value change callback */
  onChange: (value: string) => void;
  /** Whether the field is mandatory */
  required?: boolean | undefined;
  /** Autocomplete attribute */
  autoComplete?: string | undefined;
  /** Optional helper text */
  description?: string | undefined;
  /** Optional error message */
  error?: string | undefined;
  /** Optional disabled state */
  disabled?: boolean | undefined;
}

/**
 * FormField is a convenience wrapper combining Field.Root, Field.Label, Field.Input,
 * Field.Hint, and Field.Error for standard form layouts.
 */
export function FormField({
  id,
  label,
  type = "text",
  value,
  onChange,
  required,
  autoComplete,
  description,
  error,
  disabled,
}: FormFieldProps) {
  const rootProps: FieldRootProps = { id, children: null };
  if (error !== undefined) rootProps.error = error;
  if (required !== undefined) rootProps.required = required;
  if (disabled !== undefined) rootProps.disabled = disabled;

  return (
    <Field.Root {...rootProps}>
      <Field.Label>{label}</Field.Label>
      <Field.Input
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
      />
      {description && <Field.Hint>{description}</Field.Hint>}
      {error && <Field.Error>{error}</Field.Error>}
    </Field.Root>
  );
}
