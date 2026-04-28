import { motion } from "framer-motion";
import { Delete } from "lucide-react";

interface DigitKeypadProps {
  onDigitPress: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export const DigitKeypad = ({ onDigitPress, onBackspace, disabled = false }: DigitKeypadProps) => {
  const handleKeyPress = (key: string) => {
    if (disabled) return;
    
    if (key === "⌫") {
      onBackspace();
    } else if (key !== "") {
      onDigitPress(key);
    }
  };

  return (
    <motion.div 
      className="grid grid-cols-3 gap-4 max-w-xs mx-auto"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {digits.map((digit, index) => (
        <motion.button
          key={index}
          className={`
            relative h-16 w-16 rounded-2xl font-semibold text-xl
            ${
              digit === ""
                ? "invisible"
                : disabled
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-room-keypad text-foreground hover:bg-room-keypad-active active:bg-room-keypad-active shadow-lg hover:shadow-xl"
            }
            transition-all duration-200 select-none
          `}
          onClick={() => handleKeyPress(digit)}
          disabled={disabled || digit === ""}
          whileTap={!disabled && digit !== "" ? { 
            scale: 0.95,
            transition: { duration: 0.1 }
          } : {}}
          whileHover={!disabled && digit !== "" ? { 
            scale: 1.05,
            transition: { duration: 0.2 }
          } : {}}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          {digit === "⌫" ? (
            <Delete className="w-6 h-6 mx-auto" />
          ) : (
            digit
          )}
          
          {/* 3D effect shadow */}
          {!disabled && digit !== "" && (
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-gray-300 to-transparent opacity-20 -z-10 transform translate-y-1" />
          )}
        </motion.button>
      ))}
    </motion.div>
  );
};