import React from 'react'

interface RadioGroupProps {
  value?: string
  onChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

interface RadioOptionProps {
  value: string
  children: React.ReactNode
  className?: string
}

const RadioGroupContext = React.createContext<{
  value?: string
  onChange?: (value: string) => void
}>({})

export const RadioGroup: React.FC<RadioGroupProps> = ({ value, onChange, children, className = '' }) => {
  return (
    <RadioGroupContext.Provider value={{ value, onChange }}>
      <div className={`space-y-2 ${className}`}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

export const RadioOption: React.FC<RadioOptionProps> = ({ value, children, className = '' }) => {
  const { value: selectedValue, onChange } = React.useContext(RadioGroupContext)
  
  const isSelected = selectedValue === value
  
  return (
    <label className={`flex items-center space-x-2 cursor-pointer ${className}`}>
      <input
        type="radio"
        checked={isSelected}
        onChange={() => onChange?.(value)}
        className="text-primary-600 focus:ring-primary-500"
      />
      <span className={isSelected ? 'font-medium' : ''}>{children}</span>
    </label>
  )
}