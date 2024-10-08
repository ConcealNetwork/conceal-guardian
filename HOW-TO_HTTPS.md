# Remote node over https

## Table of Contents

1. [Preamble](#1-preamble)

2. [Prerequisite](#2-prerequisite)  
a. [skills](#a-skills)  
b. [Conceal Guardian](#b-conceal-guardian)  
c. [Port Forwarding](#c-port-forwarding)  
d. [Firewall](#d-firewall)  

3. [Domain Name Providers](#3-domain-name-providers)
	* [Manage DNS Zone](#manage-dns-zone)
4. [From http to https](#4-from-http-to-https)  
a. [SSL Certificate](#a-ssl-certificate)  
b. [Reverse proxy with Apache](#b-reverse-proxy-with-apache)  
	- [Install Apache](#install-apache)  
	- [Configure Virtual Host](#configure-virtual-host)  
	- [Adding SSL module](#adding-ssl-module)  
	- [Redirect http to https](#redirect-http-to-https)  

	c. [Reverse proxy with Nginx](#c-reverse-proxy-with-nginx)  
	- [Install Nginx](#install-nginx)  
	- [Configure Virtual Host Nginx](#configure-virtual-host-nginx)  
	- [Redirect to https with SSL](#redirect-to-https-with-ssl)

5. [Broadcast](#5-broadcast)
6. [Final Test](#6-final-test)
7. [Acknowledgments](#7-acknowledgments)

  

## 1. Preamble

This tutorial aims to provide, step by step, the necessary actions required to allow your node to be accessible via http and https in particular. Such access is required for web wallet clients, it can potentially increase the revenue for the node operator, since more transactions would go through the node.
  
| your node is accessible | before the tutorial   | after this tutotial                |
| ----------------------- | :-------------------: | :--------------------------------: |
| on the server itself    | localhost:16000       | localhost:16000                    |
| local network           | *your_local_ip*:16000 | *your_local_ip*:16000              |
| worldwide               | *global_ip*:16000     | *global_ip*:16000                  |
|                         |                       | http://subdomain.your_domain.xyz/  |
|                         |                       | https://subdomain.your_domain.xyz/ |
| Client compatibility    | desktop wallet        | desktop and web wallet             |

**For the ease of this tutorial, let's assume:**

| IP of computer/server where the node is installed: | *your_local_ip* (ie. 192.168.0.11) |
| -------------------------------------------------- | ---------------------------------- |
| your router has a fix IP address:                  | *global_ip* (ie. 66.82.144.155)    |
| subdomain                                          | conceal                            |
| Domain Name                                        | your_domain.xyz                    |

**This tutorial has been elaborated and tested on Ubuntu 22.04, and should also work on other Debian system**

## 2. Prerequisite

### a. Skills  
You should be familiar with terminal command usage, navigation to folders and working with files.

### b. Conceal Guardian
should be already up and running. Before moving forward, in a web browser, make sure you can access, : `localhost:16000/getinfo`

### c. Port Forwarding

on your router you probably already have port 16000 forwarded, you now have to add 80 and 443.

| port    | 16000           |
| ------- | --------------- |
| ip      | *your_local_ip* |
| TCP,UDP | Both            |

| port    | 80              |
| ------- | --------------- |
| ip      | *your_local_ip* |
| TCP,UDP | Both            |

| port    | 443             |
| ------- | --------------- |
| ip      | *your_local_ip* |
| TCP,UDP | Both            |

### d. Firewall

For this tutorial, the Apache server will run on the same server as the node. If you use a firewall, and unless already allowed, you'll need to allow connections on port 80 and 443 :

```
sudo ufw allow in "Apache Full"
```
(if you are planning to use Nginx instead: `sudo ufw allow in "Nginx Full"` )  
*please note those latter commands will work after Apache or Nginx installed.*  
| some other ufw commands 	|      				|
| -------------------------	| -----------------	|
| install ufw				| `sudo apt update` |
|							| `sudo apt install ufw` |
| enable ufw				| `sudo ufw enable`	|
| allow a port				| `sudo ufw allow 16000` |
| get status				| `sudo ufw status` |
  
## 3. Domain Name providers

Here is a list of domain name providers, note those who are including SSL certificate service. Pick one depending of your budget and/or location

[https://certbot.eff.org/hosting_providers/](https://certbot.eff.org/hosting_providers/)

Note that to save some money you only need the domain name, and don’t specifically need hosting service
If your domain name provider doesn't provide SSL certificate, you will have to self-issue it, which defeat the purpose on a trust level stand point.  
  
Let’s say you acquired *your_domain.xyz*
  
### Manage DNS Zone

In your Domain Name provider website, you should have a **manage** tab associated with the domain name you just purchased. Add a subdomain  *(ie. conceal)* and have it pointing to your IPv4 *global_ip* address using the A record.

After doing so, you'll be able to access your node with the following address:  

`conceal.your_domain.xyz:16000/getinfo`

 
## 4. From http to https

### a. SSL certificate
First we'll configure a http server and then modify it to redirect to https, for which we'll need to implement SSL adding a certificate. Two options to get a SSL certificate :

* provided by your Domain Name provider  
or
* Generated by yourself, using `certbot`, `letsencrypt`  (consult [HOW-TO_self-issue-SSL-certificate.md](./HOW-TO_self-issue-SSL-certificate.md) tutorial)

We will use the first option and download the certificate. You should end up with two files: [^1]  
[^1]: if using *certbot* you would get 4 files with .pem extension.
* your_domain.xyz.key  (or privkey.pem)
* your_domain.xyz.crt  (or fullchain.pem)
  
(you should be able to generate a certificate with a wildcard, ie  `*.your_domain.xyz`)  
  

Store them in a folder requiring superior privileges like: [^2]  
[^2]: letsencrypt or cerbot would locate those file at the mention path, so for consistency we placed our files in the same folder. Another place would be `/etc/Apache2/ssl/`  

`/etc/letsencrypt/live/conceal.your_domain.xyz/`  

:warning: the folder where the key is store should be owned by `root` and the .key file be in read and write only for `root`  
- if needed  
```
sudo chmod 600 your_domain.xyz.key   
sudo chown -R root:root conceal.your_domain.xyz/  
```
 
 

### b. Reverse proxy with Apache

The express nodejs server running on port 16000 doesn’t handle https connection, so we’ll use an Apache server to do it with a reverse proxy method.

#### Install Apache
```
sudo apt update
sudo apt install apache2
```

* enable proxy modules :
```
sudo a2enmod proxy proxy_http
```

* Restart your Apache service:
```
systemctl restart apache2
```

  
#### Configure Virtual Host

go in following folder:
```
cd /etc/apache2/sites-available
```

* create a file with your configuration: [^3]  
[^3]: some default configuration are already there, you might consider delete them or disable them ie. `sudo a2dissite 000-default.conf`
```
sudo nano conceal-your_domain-xyz.conf
```

* paste the following, and replace with your domain name:
```
<VirtualHost *:80>
ServerName conceal.your_domain.xyz
ServerAlias conceal.your_domain.xyz
ServerAdmin your@email.com

ProxyPreserveHost On
ProxyPass / http://localhost:16000/
ProxyPassReverse / http://localhost:16000/

ErrorLog /var/log/apache2/error.log
CustomLog /var/log/apache2/access.log combined

</VirtualHost>
```
**Important:** make sure the name in the certificate match the ServerName  
  

* save and enable your config:
```
sudo a2ensite conceal-your_domain-xyz.conf
```

* reload and restart the server with the following commands:
```
sudo systemctl reload apache2
sudo systemctl restart apache2
```
  
now you should be able to access your node from any web browser, using the url : `http://conceal.your_domain.xyz/`
test it with `http://conceal.your_domain.xyz/getinfo`  

#### Adding SSL module

enable SSL on apache:

```
sudo a2enmod ssl headers
```
  
#### Redirect http to https
Lets' modify our config file to redirect the http request to https and to include the certificate information:
still within `/etc/apache2/sites-available`
```
sudo nano conceal-your_domain-xyz.conf
```
and modify the file to reflect the following changes (uncomment, removing #, if you want to change options):
```
<VirtualHost *:80>

ServerName conceal.your_domain.xyz
ServerAlias conceal.your_domain.xyz
ServerAdmin your_mail@mail.com

Redirect permanent / https://conceal.your_domain.xyz

ErrorLog /var/log/apache2/error.log
CustomLog /var/log/apache2/access.log combined

</VirtualHost>
<VirtualHost *:443>

ServerName conceal.your_domain.xyz
ServerAlias conceal.your_domain.xyz
ServerAdmin your_mail@mail.com

ProxyPreserveHost On
ProxyPass / http://localhost:16000/
ProxyPassReverse / http://localhost:16000/
 
ServerSignature Off

# SSL Engine Switch:
# Enable/Disable SSL for this virtual host.
SSLEngine on

# Disable untrusted protocols (SSL v2, SSL v3)
SSLProtocol All -SSLv3 -SSLv2

# Disable unsecured encryption methods (using!)

SSLCipherSuite ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RS>

# We let the web-browser select the best choice
SSLHonorCipherOrder on

# Activation of HSTS (HTTP Strict Transport Security).
Header always set Strict-Transport-Security "max-age=15768000; includeSubDomains"

# other Header settings for CORS
Header always set Access-Control-Allow-Headers "*"
Header always set Access-Control-Allow-Methods "GET,POST,OPTIONS" 

# Certbot (automatique certification) or Letsencrypt from DomainName provider

SSLCertificateFile /etc/letsencrypt/live/conceal.your_domain.xyz/your_domain.xyz.crt
SSLCertificateKeyFile /etc/letsencrypt/live/conceal.your_domain.xyz/your_domain.xyz.key

  

# SSL Engine Options:
# Set various options for the SSL engine.
# o FakeBasicAuth:
# Translate the client X.509 into a Basic Authorisation. This means that
# the standard Auth/DBMAuth methods can be used for access control. The
# user name is the `one line' version of the client's X.509 certificate.
# Note that no password is obtained from the user. Every entry in the user
# file needs this password: `xxj31ZMTZzkVA'.
# o ExportCertData:
# This exports two additional environment variables: SSL_CLIENT_CERT and
# SSL_SERVER_CERT. These contain the PEM-encoded certificates of the
# server (always existing) and the client (only existing when client
# authentication is used). This can be used to import the certificates
# into CGI scripts.
# o StdEnvVars:
# This exports the standard SSL/TLS related `SSL_*' environment variables.
# Per default this exportation is switched off for performance reasons,
# because the extraction step is an expensive operation and is usually
# useless for serving static content. So one usually enables the
# exportation for CGI and SSI requests only.
# o StrictRequire:
# This denies access when "SSLRequireSSL" or "SSLRequire" applied even
# under a "Satisfy any" situation, i.e. when it applies access is denied
# and no other module can change it.
# o OptRenegotiate:
# This enables optimized SSL connection renegotiation handling when SSL
# directives are used in per-directory context.
#SSLOptions +FakeBasicAuth +ExportCertData +StrictRequire
<FilesMatch "\.(cgi|shtml|phtml|php)$">
 SSLOptions +StdEnvVars
</FilesMatch>
<Directory /usr/lib/cgi-bin>
 SSLOptions +StdEnvVars
</Directory>

# SSL Protocol Adjustments:
# The safe and default but still SSL/TLS standard compliant shutdown
# approach is that mod_ssl sends the close notify alert but doesn't wait for
# approach you can use one of the following variables:
# o ssl-unclean-shutdown:
# This forces an unclean shutdown when the connection is closed, i.e. no
# SSL close notify alert is send or allowed to received. This violates
# the SSL/TLS standard but is needed for some brain-dead browsers. Use
# this when you receive I/O errors because of the standard approach where
# mod_ssl sends the close notify alert.
# o ssl-accurate-shutdown:
# This forces an accurate shutdown when the connection is closed, i.e. a
# SSL close notify alert is send and mod_ssl waits for the close notify
# alert of the client. This is 100% SSL/TLS standard compliant, but in
# practice often causes hanging connections with brain-dead browsers. Use
# this only for browsers where you know that their SSL implementation
# works correctly.
# Notice: Most problems of broken clients are also related to the HTTP

# keep-alive facility, so you usually additionally want to disable
# keep-alive for those clients, too. Use variable "nokeepalive" for this.
# Similarly, one has to force some clients to use HTTP/1.0 to workaround
# their broken HTTP/1.1 implementation. Use variables "downgrade-1.0" and
# "force-response-1.0" for this.
BrowserMatch "MSIE [2-6]" \
nokeepalive ssl-unclean-shutdown \
downgrade-1.0 force-response-1.0
# MSIE 7 and newer should be able to use keepalive
BrowserMatch "MSIE [17-9]" ssl-unclean-shutdown

ErrorLog /var/log/apache2/error.log
CustomLog /var/log/apache2/access.log combined

</VirtualHost>
```

save and check configuration :

```
sudo apache2ctl configtest
```
you may obtain the following output, which is fine:  
`AH00558: apache2: Could not reliably determine the server's fully qualified domain name, using 127.0.1.1. Set the 'ServerName' directive globally to suppress this message
Syntax OK`  

reload and restart
```
sudo systemctl reload apache2
sudo systemctl restart apache2
```
  
you can test with:
```
https://conceal.your_domain.xyz/getinfo
```


### c. Reverse proxy with Nginx

This sub-paragraph is for those of you, who prefers to use Nginx instead of Apache.  

#### Install Nginx  

```
sudo apt update
sudo apt install nginx
```
* make sure your firewall has Nginx allowed: 
```
sudo ufw status
```
if not, refer to [Firewall](#d-firewall)  
* start Nginx service:
```
sudo systemctl start nginx  
```
* Check the status of Nginx:
```
sudo systemctl status nginx  
```
if statified, let's create the config file.  

#### Configure Virtual Host Nginx
```
sudo nano /etc/nginx/sites-available/conceal-your_domain-xyz
```
paste the following, and replace with your domain name:  
```
server {
    listen 80;
#    listen [::]:80; #ipv6

    server_name conceal.your_domain.xyz;
        
    location / {
        proxy_pass http://localhost:16000;
        include proxy_params;
    }
}
```
save and exit.
* enable your configuration creating a link to site enabled folder:
```
sudo ln -s /etc/nginx/sites-available/conceal-your_domain-xyz /etc/nginx/sites-enabled/
```
* test your configuration:  
```
sudo nginx -t
```
you should obtain: 
> nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful  

restart Nginx:
```
sudo systemctl restart nginx
```
Now you should be able to access your node from any web browser, using the url : `http://conceal.your_domain.xyz/`
test it with `http://conceal.your_domain.xyz/getinfo`  
  
  Note: *now would be the time to run `sudo certbot --nginx` if you elect to generate your certificate yourself with full integration.*  

#### Redirect to https with SSL

Now let's setup https. Open the config file, 
```
sudo nano /etc/nginx/sites-available/conceal-your_domain-xyz
```
and modify with the following:  
```
server {
    if ($host = conceal.your_domain.xyz) {
    return 301 https://$host$request_uri;
    }
    listen 80 default_server;
    server_name conceal.your_domain.xyz;
    return 404;
}
server {
    listen 443 ssl;
    server_name conceal.your_domain.xyz;

    # SSL configuration
    # Certbot (manual)
    ssl_certificate /etc/letsencrypt/live/conceal.your_domain.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/conceal.your_domain.xyz/privkey.pem;
    # ssl on;
    ssl_session_cache  builtin:1000  shared:SSL:10m;
    ssl_protocols  TLSv1 TLSv1.1 TLSv1.2 TSLv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384";


    # Set the access log location

    access_log            /var/log/nginx/conceal_node.access.log;

    location / {
        proxy_pass http://localhost:16000;
        proxy_redirect http://localhost:16000 https://conceal.your_domain.xyz;

    # proxy_param in proxy_params file
        include proxy_params;

    # Set the security Headers
      add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
      add_header X-Frame-Options DENY; #Prevents clickjacking
      add_header X-Content-Type-Options nosniff; #Prevents mime sniffing
      add_header X-XSS-Protection "1; mode=block"; #Prevents cross-site scripti>
      add_header Referrer-Policy "origin";
    # Cors
      add_header 'Access-Control-Allow-Headers' '*';
      # add_header 'Access-Control-Allow-Origin' '*'; #self-implied
      add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
}
}
```
save, exit and check your syntax:
```
sudo nginx -t
```
reload
```
sudo systemctl reload nginx
```
  
you can test with:
```
https://conceal.your_domain.xyz/getinfo
```



## 5. Broadcast

Within **conceal-guardian** folder, modify your **config.json** file to include the following parameters :

```
"url": {
"host": "conceal.your_domain.xyz",
"port": ""
}
```
  
and restart Conceal-guardian. if you're using a service to launch, it should be something like :
```
sudo systemctl restart ccx-guardian.service
```
  
 
## 6. Final Test
in a web wallet, go in **Settings** tab, toggle the switch **Use custom node** and fill with the url : `https://conceal.your_domain.xyz/`

an other way to test, is to check if your node is listed in the [Conceal Network explorer page json file](https://explorer.conceal.network/pool/list?hasFeeAddr=true&isReachable=true&hasSSL=true)
  
  
## 7. Acknowledgments
Thank you to the different members of Conceal Dev and Community teams who inspired this tutorial, those who tested it, and also M. CRISPIN providing code for SSL in the config file.


this complete this tutorial.
  
### Notes:
 We decided to proceed in two steps, first create the http reverse proxy and then redirect it to https, for educational purpose and  also to allow intermediate testing.  

Some circumpstances may increase the level of difficulty of this procedure and would need to be addressed, such as:
* ISP does not provide a fix IP
* self-issued certificate
* certificate renewal