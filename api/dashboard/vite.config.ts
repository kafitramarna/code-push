import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev proxy targets the api container's host port (compose maps 3010 -> 3000).
const API = process.env.VITE_API_PROXY ?? "http://localhost:3010";

export default defineConfig({
  base: "/dashboard/",
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/apps": API,
      "/account": API,
      "/accessKeys": API,
      "/auth": API,
    },
  },
});
