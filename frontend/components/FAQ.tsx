'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { faqs } from '@/lib/faq';

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="bg-crema-base py-24 border-b border-gris-borde">
      <div className="max-w-3xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="font-manrope text-xs font-bold uppercase tracking-[0.2em] text-gris-suave mb-4 block">
            Preguntas frecuentes
          </span>
          <h2 className="font-playfair text-4xl sm:text-5xl font-bold text-negro-carbon mb-4">
            Todo lo que necesitás saber
          </h2>
          <p className="font-manrope text-sm leading-relaxed text-gris-suave">
            Respondemos las dudas más comunes para que puedas organizar tu evento con total tranquilidad.
          </p>
        </div>

        {/* Accordion */}
        <div className="divide-y divide-gris-borde border-t border-gris-borde">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className="py-1">
                <button
                  id={`faq-btn-${index}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${index}`}
                  onClick={() => toggle(index)}
                  className="w-full flex items-center justify-between py-5 text-left gap-4 group focus:outline-none"
                >
                  <span
                    className={`font-manrope text-sm font-semibold leading-snug transition-colors duration-200 ${
                      isOpen ? 'text-negro-carbon' : 'text-negro-carbon/80 group-hover:text-negro-carbon'
                    }`}
                  >
                    {faq.question}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center border border-gris-borde text-negro-carbon"
                  >
                    <ChevronDown size={14} strokeWidth={2.5} />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-panel-${index}`}
                      role="region"
                      aria-labelledby={`faq-btn-${index}`}
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="font-manrope text-sm text-gris-suave leading-relaxed pb-5 pr-10">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default FAQ;
