# Self issued SSL certificate

## Table of Contents

1. [Preamble](#1-preamble)

2. [Prerequisite](#2-prerequisite)  
a. [skills](#a-skills)  
b. [Domain Name](#b-domain-name)  

3. [Self issue SSL certificate](#3-self-issue-ssl-certificate)  
a. [Certbot Installation](#a-certbot-installation)  
b. [Certbot Setup](#b-certbot-setup)  
c. [Implement Certificate](#c-implement-certificate)  
d. [Certificate Autorenewal](#d-certificate-autorenewal)
4. [Notes](#4-notes)


  

## 1. Preamble

This tutorial aims to provide guidance to self-issue SSL certifificate for your node being accessible via https. The general method to reverse proxy your node over https is provided in the [HOW-TO_HTTPS.md](./HOW-TO_HTTPS.md) tutorial.  

Self-issuing certificate has some benefits:  
* save some money (in case the domain name provider charge for this service)
* allow automatisation of the renewal process 
* generates .pem files more commun nowadays than .key or .crt

**This tutorial has been elaborated and tested on Ubuntu 22.04, and should also work on other Debian system**

## 2. Prerequisite

### a. Skills  
You should be familiar with terminal command usage, navigation to folders and working with files.

### b. Domain Name  
Let’s say you acquired *your_domain.xyz*  

You have acquired a domain name and opt to issue the SSL certificate on your own. So you would be at step 4.a. of [HOW-TO_HTTPS.md](./HOW-TO_HTTPS.md) tutorial.
Also you will need your Apache config file fully ready, therefore all 4.b. steps completed except testing and SSLCertificate lines commented with # :
```
# Certbot (automatique certification) or Letsencrypt from DomainName provider

#SSLCertificateFile /etc/letsencrypt/live/conceal.your_domain.xyz/your_domain.xyz.crt
#SSLCertificateKeyFile /etc/letsencrypt/live/conceal.your_domain.xyz/your_domain.xyz.key

```  

Certbot will extract informations from your config file to request the certificate.  



  
## 3. Self issue SSL certificate

We'll use Certbot to facilitate our task. Cerbot is a client of [Let's Encrypt](https://letsencrypt.org/) API. you can find more information about Cerbot on their website [https://certbot.eff.org](https://certbot.eff.org). 
  
### a. Certbot installation
 

As we'll use the snap version of certbot, make sure any previous version installed with apt are removed.
* remove apt installed version if needed:
```
sudo apt-get remove certbot
```
* install snap version:
```
sudo snap install --classic certbot
```
* making sure cerbot command can be run:
```
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### b. Certbot Setup
we'll use cerbot only to generate certificate but not to  intervene in our Apache [^1] config file:  
[^1]: nginx users : `sudo certbot certonly --nginx` or consider `sudo certbot certonly --standalone` or even `sudo certbot --nginx` for full certbot intervention.
```
sudo certbot certonly --apache  
```
* you'll be invited to enter your e-mail address

>Saving debug log to /var/log/letsencrypt/letsencrypt.log
Enter email address (used for urgent renewal and security notices)  
(Enter 'c' to cancel): `your-email@exemple.com`

* then you are invited to agree to the Term of Service:  

> Please read the Terms of Service at
https://letsencrypt.org/documents/LE-SA-v1.4-April-3-2024.pdf. You must agree in
order to register with the ACME server. Do you agree?  
(Y)es/(N)o: Y

* Then you'll be ask if you want to share your email:
> Would you be willing, once your first certificate is successfully issued, to
share your email address with the Electronic Frontier Foundation, a founding
partner of the Let's Encrypt project and the non-profit organization that
develops Certbot? We'd like to send you email about our work encrypting the web,
EFF news, campaigns, and ways to support digital freedom.  
(Y)es/(N)o: N

* then certbot will ask which domain you want to activate HTTPS for:
> Which names would you like to activate HTTPS for?
We recommend selecting either all domains, or all domains in a VirtualHost/server block.  
1: conceal.your_domain.xyz  
Select the appropriate numbers separated by commas and/or spaces, or leave input
blank to select all options shown (Enter 'c' to cancel): 1  


The certificate files (4 in total with .pem extension) will be generated and located in:
`/etc/letsencrypt/live/conceal.your_domain.xyz/`

### c. Implement Certificate
in your config file, uncomment the two SSL certificate relative line and modify with your site information :
```
cd /etc/apache2/sites-available
sudo nano conceal-your_domain-xyz.conf
```
and modify and uncomment (remove #)
```
SSLCertificateFile /etc/letsencrypt/live/conceal.your_domain.xyz/fullchain.pem
SSLCertificateKeyFile /etc/letsencrypt/live/conceal.your_domain.xyz/privkey.pem
```
save and exit, reload and restart your server.
 ```
sudo systemctl reload apache2
sudo systemctl restart apache2
 ```


### d. Certificate Autorenewal
Let's Encrypt certificates are only valid for 90 days. Cerbot offers a nice feature which auto-renew the certificate, using a cron job.
* To do a dry run:
```
sudo certbot renew --dry-run
```
*(you may have to stop the server to do the test `sudo systemctl stop nginx`)*  

you should optain something like that:
>Congratulations, all simulated renewals succeeded: 
  /etc/letsencrypt/live/conceal.your_domain.xyz/fullchain.pem (success)  
  
* To reload after renewal:  

After being renewed, you would need to restart Apache. Certbot can do that for you, append the file `conceal.your_domain.xyz.conf` located in `/etc/letsencrypt/renewal/` :
```
cd /etc/letsencrypt/renewal/
sudo nano conceal.your_domain.xyz.conf
```
and add, at the end, the line:  
```
renew_hook = systemctl reload apache2
```
you can re-run the dry-run to make sure there are no error :
```
sudo certbot renew --dry-run
```

you should obtain again :

> Congratulations, all simulated renewals succeeded: 
  /etc/letsencrypt/live/conceal.your_domain.xyz/fullchain.pem (success)  

  
---
  
from here you can refork to step 5 of [HOW-TO_HTTPS.md](./HOW-TO_HTTPS.md) tutorial.  

## 4. Notes
 We decided to proceed with a conservative approach, you can also elect to have Cerbot intervene in your config file using `sudo certbot --apache` instead of `sudo certbot certonly --apache` command when doing the setup.