# KipitKlin

KipitKlin is a static community waste-reporting website, deployed on Vercel.

## Features

- Report a waste site with a photo and browser location.
- Browse community reports and optionally see distances from your location.
- Volunteer for a clean-up on the second or third Saturday of the next three months.
- Pledge equipment and view your own activity.

## Project structure

```
public/
  index.html       # Page structure
  css/styles.css   # Site styles
  js/app.js        # Application behaviour
  js/config.js     # Firebase and upload configuration
  js/dates.js      # Clean-up Saturday date generator
  js/dom.js        # Shared DOM helpers
```

## Deploy

Import the repository into Vercel or run `npx vercel --prod`. Vercel serves the `public` directory directly.
