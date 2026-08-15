FROM php:8.3-apache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    zlib1g-dev \
    zip \
    unzip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install required PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install mysqli pdo pdo_mysql gd

# Enable Apache rewrite and allow .htaccess overrides
RUN a2enmod rewrite \
    && sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/local/bin/composer

# Copy DVWA into web root
COPY DVWA /var/www/html/dvwa

# Use DVWA's php.ini settings
RUN cp /var/www/html/dvwa/php.ini /usr/local/etc/php/conf.d/dvwa.ini

# Create missing directories and set permissions
RUN mkdir -p /var/www/html/dvwa/hackable/uploads \
    && chown -R www-data:www-data /var/www/html/dvwa \
    && chmod -R 777 /var/www/html/dvwa/hackable/uploads

# Install API dependencies
RUN cd /var/www/html/dvwa/vulnerabilities/api && composer install