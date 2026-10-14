import { Font } from "@react-pdf/renderer";
import path from "path";

// Shared across every PDF document — PDF base fonts (Helvetica etc.) don't
// support Czech diacritics, so every document needs this Unicode font
// registered. Importing this module is enough; Font.register is a no-op
// side effect that only needs to run once per family name.
Font.register({
  family: "NotoSans",
  fonts: [
    { src: path.join(process.cwd(), "lib/pdf/fonts/NotoSans-Regular.ttf"), fontWeight: "normal" },
    { src: path.join(process.cwd(), "lib/pdf/fonts/NotoSans-Bold.ttf"), fontWeight: "bold" },
  ],
});
