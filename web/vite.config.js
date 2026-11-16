import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// O navegador usa /api; o Vite encaminha a chamada ao Express local.
const proxy = {
    "/api": {
        target: "http://127.0.0.1:3000",
        rewrite: path => path.replace(/^\/api/, ""),
    },
};
export default defineConfig({
    plugins: [react()],
    server: { host: "localhost", port: 5173, strictPort: true, proxy },
    preview: { host: "localhost", port: 4173, strictPort: true, proxy },
});
