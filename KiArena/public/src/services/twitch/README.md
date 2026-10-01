# Twitch chat adapter

This folder is the integration boundary for live chat. The adapter should translate a Twitch message into the arena command contract (`E`, `V`, `M`, `K`) and pass the Twitch login as the stable player key. It must not contain game combat rules or write Firestore directly; those remain in `app/` and `services/firebase/`.

The live connection is not enabled yet. Before implementing OAuth/EventSub, configure a Twitch application and callback URL. Keep client secrets and refresh tokens in a trusted backend or secret manager, never in `public/` or Firestore documents readable by the browser.
