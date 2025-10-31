import * as React from "react"
import { cn } from "@/lib/utils"

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number[]
  onValueChange: (value: number[]) => void
  min?: number
  max?: number
  step?: number
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange([parseFloat(e.target.value)])
    }

    return (
      <input
        type="range"
        ref={ref}
        className={cn(
          "w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white",
          className
        )}
        value={value[0]}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        style={{
          background: `linear-gradient(to right, white 0%, white ${((value[0] - min) / (max - min)) * 100}%, #374151 ${((value[0] - min) / (max - min)) * 100}%, #374151 100%)`,
        }}
        {...props}
      />
    )
  }
)
Slider.displayName = "Slider"

export { Slider }

