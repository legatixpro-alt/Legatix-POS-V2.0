import React, { useState } from 'react';
import { X, Delete, Calculator } from 'lucide-react';

interface CalculatorModalProps {
  onClose: () => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({ onClose }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [newNumber, setNewNumber] = useState(true);

  const handleNum = (num: string) => {
    if (newNumber) {
      setDisplay(num);
      setNewNumber(false);
    } else {
      setDisplay(display === '0' && num !== '.' ? num : display + num);
    }
  };

  const handleOp = (op: string) => {
    if (!newNumber || equation === '') {
      setEquation(display + ' ' + op);
      setNewNumber(true);
    } else {
      setEquation(equation.slice(0, -1) + op);
    }
  };

  const handleCalc = () => {
    if (!equation) return;
    try {
      // Safe evaluation of simple math expressions
      const sanitizedExpr = (equation + ' ' + display).replace(/[^-()\d/*+.]/g, '');
      const result = new Function('return ' + sanitizedExpr)();
      setDisplay(String(Number(result.toFixed(6)))); // Prevent floating point madness
      setEquation('');
      setNewNumber(true);
    } catch (e) {
      setDisplay('Error');
      setNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setNewNumber(true);
  };

  const handleDel = () => {
    if (newNumber) return;
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
      setNewNumber(true);
    }
  };

  const btnClass = "h-14 rounded-xl font-mono font-bold text-xl flex items-center justify-center transition-all active:scale-95 border cursor-pointer";
  const numClass = `${btnClass} bg-[#161820] text-gray-200 border-[#232530] hover:bg-[#1D202A] hover:border-[#D4AF37]/40`;
  const opClass = `${btnClass} bg-[#D4AF37]/15 text-[#F5DA76] border-[#D4AF37]/30 hover:bg-[#D4AF37]/25 hover:border-[#D4AF37]/60`;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-[#111216] border border-[#D4AF37]/40 rounded-2xl w-full max-w-[340px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col animate-fadeIn">
        {/* header */}
        <div className="p-4 bg-gradient-to-r from-[#161820] to-[#121318] border-b border-[#232530] flex justify-between items-center">
          <div className="flex items-center gap-2 text-[#D4AF37]">
            <Calculator size={18} />
            <span className="font-display tracking-widest uppercase font-bold text-sm text-white">Calculadora POS</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white bg-[#232530] hover:bg-[#2F3242] p-1.5 rounded-lg transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>
        
        {/* display */}
        <div className="px-5 py-6 bg-[#090A0D] border-b border-[#232530] flex flex-col items-end justify-end h-32 relative">
          <div className="text-gray-500 text-sm h-5 font-mono mb-1">{equation}</div>
          <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F5DA76] via-[#D4AF37] to-[#A88120] tracking-wider font-mono truncate w-full text-right drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]">
            {display}
          </div>
        </div>

        {/* keypad */}
        <div className="p-4 grid grid-cols-4 gap-2.5 bg-[#111216]">
          <button onClick={handleClear} className={`${btnClass} bg-[#FF5252]/15 text-[#FF5252] border-[#FF5252]/30 hover:bg-[#FF5252]/25 col-span-2`}>C</button>
          <button onClick={handleDel} className={`${btnClass} bg-[#161820] text-gray-200 border-[#232530] hover:bg-[#1D202A]`}><Delete size={20} /></button>
          <button onClick={() => handleOp('/')} className={opClass}>÷</button>

          <button onClick={() => handleNum('7')} className={numClass}>7</button>
          <button onClick={() => handleNum('8')} className={numClass}>8</button>
          <button onClick={() => handleNum('9')} className={numClass}>9</button>
          <button onClick={() => handleOp('*')} className={opClass}>×</button>

          <button onClick={() => handleNum('4')} className={numClass}>4</button>
          <button onClick={() => handleNum('5')} className={numClass}>5</button>
          <button onClick={() => handleNum('6')} className={numClass}>6</button>
          <button onClick={() => handleOp('-')} className={opClass}>-</button>

          <button onClick={() => handleNum('1')} className={numClass}>1</button>
          <button onClick={() => handleNum('2')} className={numClass}>2</button>
          <button onClick={() => handleNum('3')} className={numClass}>3</button>
          <button onClick={() => handleOp('+')} className={opClass}>+</button>

          <button onClick={() => handleNum('0')} className={`${numClass} col-span-2`}>0</button>
          <button onClick={() => handleNum('.')} className={numClass}>.</button>
          <button onClick={handleCalc} className={`${btnClass} gold-gradient-btn text-black font-extrabold hover:brightness-110 shadow-[0_0_15px_rgba(212,175,55,0.4)]`}>=</button>
        </div>
      </div>
    </div>
  );
};
