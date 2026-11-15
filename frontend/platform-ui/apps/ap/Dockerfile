FROM node:20.18.0 as build-stage
WORKDIR /app
# COPY kendo-ui-license*.txt ./ 
# COPY package*.json ./
# RUN npm install
COPY ./ .
RUN npm ci --ignore-scripts
ARG project_env
RUN npm run build --no-cache

FROM nginx:stable as production-stage
COPY --from=build-stage /app/dist /var/www/html/dist
