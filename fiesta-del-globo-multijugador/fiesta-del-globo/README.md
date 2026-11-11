# Fiesta del Globo — multijugador en español

Juego web para 2 a 8 participantes, con salas privadas por código, turnos sincronizados y respuestas por categoría.

## Probar localmente

Instala Node.js 20 o superior. En esta carpeta ejecuta:

```bash
npm install
npm start
```

Abre http://localhost:3000 en tu navegador. Para probar con varios participantes, abre dos ventanas diferentes y entra con distintos nombres.

## Publicar en Render

1. Crea una cuenta en https://github.com y un repositorio nuevo.
2. Sube todos los archivos de esta carpeta al repositorio, incluida la carpeta `public`.
3. Crea una cuenta en https://render.com y selecciona **New > Web Service**.
4. Conecta el repositorio de GitHub.
5. Configura **Runtime: Node**, **Build Command: npm install**, **Start Command: npm start**.
6. Elige un plan disponible (puede haber un plan gratuito con suspensión por inactividad) y pulsa **Deploy Web Service**.
7. Render te dará una URL HTTPS pública. Compártela para que los amigos entren.

No necesitas configurar variables de entorno ni una base de datos para esta versión.

## Limitaciones de la primera versión

- Las salas se almacenan en memoria: si el servidor se reinicia, las partidas se pierden.
- Si alguien pierde la conexión, sale de la partida; todavía no existe reconexión automática.
- El juego está diseñado para una sola instancia de servidor. No actives múltiples instancias sin añadir un almacén compartido y adaptador de Socket.IO.
- El diccionario de respuestas es limitado; puede rechazar palabras correctas no incluidas.
- El cronómetro y la validación de respuestas se controlan en el servidor.
- Para producción con mucho tráfico se recomienda agregar persistencia, moderación y limitación de peticiones.

## Archivos

- `server.js`: servidor Node.js, salas, turnos y validación.
- `public/index.html`: interfaz del juego para navegador y celular.
- `package.json`: dependencias y comando de arranque.
