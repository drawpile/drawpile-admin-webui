# Drawpile Admin Web UI

This is supposed to be a unified admin interface for Drawpile servers. At the time of writing, it only supports the [seession listing server](https://github.com/drawpile/listserver) though.

Setup:

```sh
npm install
```

To build for production (the URL must point to the admin URL of your listing server):

```sh
npm run build -- "https://your-listserver-url/admin"
```

To deploy, copy everything from `dist` and serve it with nginx or something.

To build for development (will overwrite the stuff in `dist`):

```sh
npm run dev
```

You can use `./serve.py` to serve the UI at `localhost:8000`.
