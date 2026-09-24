# TamboGo · guía para ponerla a funcionar de verdad

## Qué archivos subir (todos juntos, en la misma carpeta / repositorio)
```
index.html        la app
mapbase.js        mapa nítido (vectorial) usado por la app y el panel
admin.html        tu panel de administración
manifest.json     hace que se pueda instalar como app
reset.html        (opcional) página de recuperación con el logo
sw.js             abre más rápido y aguanta cortes cortos de internet
icons/            íconos de la app (4 archivos PNG)
firestore.rules   reglas de seguridad (se pegan en Firebase, no se suben al sitio)
```
Sin configurar Firebase, la app corre en **modo demo** (conductores simulados).

## 1. Crear el servidor gratis (Firebase)
1. https://console.firebase.google.com → crear proyecto `tambogo`.
2. **Authentication** → Comenzar → activar **Correo electrónico/contraseña**.
3. **Firestore Database** → Crear base de datos → modo producción.
4. Pestaña **Reglas** → borra todo, pega `firestore.rules` → **Publicar**.
5. Configuración del proyecto → Tus apps → `</>` Web → copia el `firebaseConfig`.

## 2. Conectar
- `index.html`: busca `CONFIG` y pega los datos en `firebase: { ... }`.
- `admin.html`: pega los mismos datos en `FIREBASE_CONFIG`.
- El número de Nequi, WhatsApp de soporte, tarifas y avisos se cambian después desde el panel (pestaña **Ajustes**), sin tocar código.

## 3. Publicar (necesita HTTPS)
- GitHub Pages o Netlify. Sube todo junto (la carpeta `icons` incluida).
- Firebase → Authentication → Configuración → **Dominios autorizados** → agrega tu dirección.
- En la app: Menú → Compartir TamboGo → pega la dirección pública → descarga los carteles con QR.
- **Cada vez que cambies `index.html`**, sube también `sw.js` con el número `VERSION` cambiado (v3 → v4) para que los celulares se actualicen.

## 4. Tu cuenta de administrador
1. Regístrate en la app como pasajero.
2. Firebase → Firestore → colección `users` → tu documento → agrega campo `admin` (boolean) = `true`.
3. Entra a `tu-direccion/admin.html`. En el menú de la app también te aparecerá "Panel de administración".
4. En **Ajustes** del panel pon tu Nequi, WhatsApp de soporte y revisa las tarifas.

## 5. Operación diaria
- **Mapa en vivo:** conductores conectados, viajes activos y emergencias, actualizado solo.
- **Conductor nuevo:** aparece en Conductores (con insignia roja). Pídele por WhatsApp fotos de cédula, licencia, SOAT y tarjeta de propiedad, compáralas con lo que escribió y pulsa Aprobar.
- **Recarga:** el conductor transfiere a tu Nequi y pulsa "Ya envié el pago" → en Recargas verificas en tu app Nequi → Acreditar.
- **Emergencia (SOS):** suena una alarma y sale un cuadro rojo con nombre, celular y ubicación. Llama a la persona y marca "Atendida".
- **Viajes atascados:** pestaña Viajes → "Limpiar viajes atascados".
- La comisión ($300) se descuenta sola al finalizar cada viaje.

## 6. Lista de pruebas antes de abrir al público (haz TODO con 2 celulares)
1. Registro de pasajero y de conductor; aprobar desde el panel; comprobar saldo de bienvenida.
2. Conductor: **Conectarme** con GPS → aparece en el mapa del panel y del pasajero.
3. Pasajero pide viaje → conductor recibe → ofrece/contraoferta → pasajero acepta.
4. Se ven en el mapa mientras se acercan; el conductor "Llegué" → PIN incorrecto (debe rechazar) → PIN correcto → iniciar → finalizar.
5. Verificar: saldo bajó $300, viaje en historial de ambos, calificación aparece en el perfil del conductor.
6. Cancelar en cada etapa (pasajero y conductor) y confirmar que el otro lado se entera.
7. Recarga completa por Nequi con un monto real pequeño.
8. Botón de emergencia: llega la alerta al panel con alarma.
9. Cerrar y reabrir la app en mitad de un viaje: debe retomarlo.
10. Instalar en Android (Chrome → Instalar app) y en iPhone (Safari → Compartir → Agregar a inicio).
Hazlo primero con conductores conocidos (un piloto de 5 a 10) antes de abrirlo a todo el pueblo.

## 7. Lo que sigue siendo manual o no incluido
- **Pagos:** la verificación de Nequi es manual. Para automatizarla necesitas una pasarela (Wompi, ePayco…) con cuenta empresarial.
- **Avisos con la app cerrada** (notificaciones push) requieren un servidor de envío (Firebase Functions, plan de pago). Hoy avisa con sonido y vibración con la app abierta y con notificación local si la app está en segundo plano.
- **Mapa:** OpenStreetMap sirve para el piloto. Con muchos usuarios cambia a MapTiler o Stadia (`CONFIG.tileUrl`).
- **Legal:** los "Términos y privacidad" de la app son un texto base. Que un abogado los revise, registra tu base de datos si aplica (Ley 1581 de 2012) y confirma con la alcaldía o tránsito local los requisitos para operar mototaxis/tuctucs y que los conductores estén en regla.
- **Costos:** Firebase gratis alcanza para empezar; vigila el consumo en la consola cuando crezcas.

## 8. Recuperar contraseñas (automático)
- Cada persona se registra con su correo electrónico y entra con ese correo y su contraseña.
- Si la olvida: "¿Olvidaste tu contraseña?" → escribe su correo → Firebase le envía solo un enlace para crear una contraseña nueva. No necesitas intervenir.
- Desde el perfil también puede cambiarla cuando quiera ("Cambiar mi contraseña").
- Al registrarse se envía además un correo de verificación (no bloquea el uso).
- Las cuentas antiguas (creadas con solo celular) siguen entrando escribiendo el celular, pero no pueden recuperar la contraseña: bórralas y regístralas de nuevo con correo.
- Personaliza el correo en Firebase → Authentication → Plantillas → Restablecimiento de contraseña.

## 9. Diseño, sonidos y mapa (versión 4)
- Logo nuevo (ícono degradado esmeralda-cian con pin y anillo de ubicación). Archivos: `logo-icono.svg`, `logo-tambogo.svg` y la carpeta `icons/`.
- Los botones principales muestran un círculo de carga mientras se procesa (ingreso, registro, pedir viaje, aceptar, recargar, etc.).
- Sonidos suaves generados por la app (sin archivos de audio). Se pueden silenciar en Menú → Sonidos.
- Mapa vectorial (OpenFreeMap, sin llave) con paleta oscura propia. Si no carga en 10 segundos, usa mosaicos normales en alta resolución. Se controla desde `CONFIG.useVector` en `index.html`.
- Panel de administración rediseñado: menú lateral, resumen con indicadores, mapa en vivo con listas, gráfica de 7 días, ventanas de confirmación y avisos.
- Al actualizar, sube TODOS los archivos juntos y cambia el número `VERSION` de `sw.js` si vuelves a modificar algo.

## 10. Versión 5: diseño del usuario y tipografía
- Tipografías: Unbounded (marca, títulos y precios) y Sora (frases de apoyo). El texto corrido sigue en Plus Jakarta Sans.
- Portada animada con la marca, favoritos y recientes en la pantalla principal (en modo real ya no aparecen lugares de demostración), línea de tiempo del viaje, placa visible del vehículo y resumen final con recibo.
- Panel: el mapa en vivo ya carga correctamente.
