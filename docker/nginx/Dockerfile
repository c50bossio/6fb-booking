# BookedBarber V2 Nginx Reverse Proxy (Production)
FROM nginx:1.25-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/conf.d/ /etc/nginx/conf.d/
COPY docker/nginx/ssl/ /etc/nginx/ssl/

# Copy static files and assets
COPY --from=frontend-builder /app/public /usr/share/nginx/html/static

# Create nginx user and set permissions
RUN addgroup -g 101 -S nginx-group && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx-group -g nginx nginx-user

# Create necessary directories
RUN mkdir -p /var/log/nginx /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp && \
    chown -R nginx-user:nginx-group /var/log/nginx /var/cache/nginx && \
    chmod -R 755 /var/log/nginx /var/cache/nginx

# Copy health check script
COPY docker/nginx/healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Switch to non-root user
USER nginx-user

# Expose ports
EXPOSE 80 443

# Start nginx
CMD ["nginx", "-g", "daemon off;"]