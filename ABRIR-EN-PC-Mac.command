#!/bin/bash
echo ""
echo "  ============================================"
echo "    THE SYSTEM - Iniciando servidor local..."
echo "  ============================================"
echo ""
echo "  No cierres esta ventana mientras uses la app."
echo "  Para cerrar la app: cierra esta ventana (Ctrl+C)."
echo ""
cd "$(dirname "$0")"
( sleep 1 && open "http://localhost:8123/index.html" ) &
python3 -m http.server 8123
