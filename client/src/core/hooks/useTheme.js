import { useContext } from "react";

import ThemeContext from "@/core/store/ThemeContext";

const useTheme = () => {
  return useContext(ThemeContext);
};

export default useTheme;
