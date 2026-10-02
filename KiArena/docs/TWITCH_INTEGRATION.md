# Integración de Twitch — plan y estado

## Estado

**Pendiente de implementación.** El juego aún no inicia sesión con Twitch ni recibe mensajes de un canal en vivo. El folder `public/src/services/twitch/` documenta el límite donde vivirá ese adaptador. El chat web y sus botones `E/K/M/V` sirven hoy para simular comandos manuales.

## Comportamiento objetivo acordado

1. Espectador escribe en el chat del canal.
2. Un cliente Twitch recibe el mensaje y conserva el login estable del espectador.
3. Un parser reconoce comandos válidos de la arena.
4. El adaptador envía nombre y comando al caso de uso de la app; el juego reutiliza entrada, validación de raza/nivel y lógica de técnicas.
5. El progreso persiste en Firestore con la clave de usuario acordada, una vez que se defina si el ID estable será login de Twitch, ID de cuenta Twitch o ambos.

Comandos de arena planteados: `E` entrar; `V` Rayo Mortal para Freezer; `M` Makankosappo; `K` Kamehameha. Mensajes que no sean comandos pueden mostrarse en chat sin disparar acciones.

## Decisiones de diseño

- Mantener la integración Twitch desacoplada del motor y del adaptador Firestore.
- Preferir una vía oficial actual de Twitch, con OAuth de usuario y EventSub por WebSocket para eventos de chat. La suscripción para leer chat requiere autorización apropiada; definir si será cliente instalado por la persona dueña del canal o chatbot separado antes de elegir scopes.
- Si OAuth requiere Client Secret o renovación de token, procesarlo en backend/secret manager, no en JavaScript público. Un static site no debe fingir que puede proteger un secreto.
- Deduplicar notificaciones/eventos y limitar mensajes para que reintentos o spam no multipliquen ataques.
- No permitir que el broadcaster o un mensaje sin identidad válida sobrescriba otro perfil.
- Documentación oficial: [autenticación de chat](https://dev.twitch.tv/docs/chat/authenticating/), [manejo de WebSocket EventSub](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/), [tipos de suscripción](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/).

## Información necesaria antes de habilitarlo

- Nombre/login del canal de Twitch.
- Client ID de la aplicación Twitch y URL(s) de callback registradas.
- Decisión de quién autoriza: el canal broadcaster o una cuenta bot; escoger scopes mínimos.
- URL de Hosting/origen aprobado, que determina el callback permitido.
- Confirmar si cada participante se identifica por Twitch ID estable, login visible o alias del juego. Recomendación técnica: Twitch user ID como clave externa y mantener `username` solo como presentación.
- Confirmar manejo de comandos de prueba/botones manuales una vez conectado el chat real.

No pegar Client Secret, access token ni refresh token en este repositorio o chat. El flujo de login, backend y Firestore conectado a la arena todavía está por construir.
