# Conceal Node Guardian Installation Instructions

## 1. Getting the executables and meeting prerequisites

First you need to download the correct release for your OS. You can find the latest releases [here](https://github.com/ConcealNetwork/conceal-guardian/releases)
Once the executables are donwloaded you simply extract them to directory of your choice.

If you are running o Windows you are fine, you don't need to do anything more in terms of prerequisites. But on linux you need to install "libboost".

On Debiand based system (Debian, Ubuntu, Mint...) you can simply do it like this:

```
sudo apt-get update
sudo apt-get install libboost-all-dev
```

Then you are ready to go.

## 2. Installation

You can run the Guardian in two ways. You can simply run the executable and it will start and lift up the node daemon and the monitor it. But this way if you restart your computer or kill the seesion, it will not automaticall start again.
In order to persist reboots you need to install it as a system service. Luckily the Guardian make this extremly easy for you. But first we need to configure it. The Guardian has build in interactive setup so its easy to do and you don't need to edit confi.json.

Just run it with ```guardian-linux64.exe --setup``` or on windows simply click in ```setup.bat```. Each OS has the executable of a different name so please use the appropriate on for your OS (I am using the linux one here).
You will get something like this
