FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css app.js summaries.js todos.js settings.js /usr/share/nginx/html/

EXPOSE 80
