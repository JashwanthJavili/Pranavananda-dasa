import { createContext, useContext } from 'react';

/** Opens the "Need help" form from anywhere in the portal: openHelp({ category, message, mobile, ... }). */
export const OpenHelpContext = createContext(() => {});
export const useOpenHelp = () => useContext(OpenHelpContext);
