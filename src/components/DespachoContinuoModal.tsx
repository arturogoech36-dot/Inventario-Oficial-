import React from 'react';
import { TerminalPistolaModal, TerminalPistolaModalProps } from './TerminalPistolaModal';

export const DespachoContinuoModal: React.FC<TerminalPistolaModalProps> = (props) => {
  return <TerminalPistolaModal {...props} initialMode="despacho" />;
};

export default DespachoContinuoModal;
