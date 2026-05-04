FROM php:8.1-apache

# Install required PHP extensions
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Enable Apache rewrite
RUN a2enmod rewrite

# Copy DVWA into web root
COPY DVWA /var/www/html/dvwa

# Fix permissions
RUN chown -R www-data:www-data /var/www/html/dvwa