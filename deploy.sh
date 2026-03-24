#!/bin/bash
# Internal deploy script — called by Claude after any code change
VERCEL_ORG_ID="team_oKaol6h5RgP01y9JBHaQtnzG"
VERCEL_PROJECT_ID="prj_kyJdIOiaPtmeVWd2ePWiTeowbHvg"
vercel deploy --prod --yes \
  --scope $VERCEL_ORG_ID 2>&1
