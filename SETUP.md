# Conceal Node Guardian Installation Instructions

## 1. Getting the executables and meeting prerequisites

First you need to download the correct release for your OS. You can find the latest releases [here](https://github.com/ConcealNetwork/conceal-guardian/releases).
Once the executables are downloaded, you simply extract them to directory of your choice.

If you are running on Windows you are fine, you don't need to do anything more in terms of prerequisites. But on linux, you need to install "libboost".

On Debiand based system (Debian, Ubuntu, Mint...) you can simply do it like this:

```
sudo apt-get update
sudo apt-get install libboost-all-dev
```

Then you are ready to go.

## 2. Options setup

You can run the Guardian in two ways. You can simply run the executable and it will start and lift up the node daemon and then monitor it. But this way, if you restart your computer, or kill the session, it will not automatically start again.
In order to persist reboots you need to install it as a system service. Luckily the Guardian makes this extremly easy for you. But first we need to configure it. The Guardian has a build in interactive setup, so this is easy to do and you don't need to edit **config.json**.

Just run it with ```./guardian-linux64.exe --setup``` or on windows simply click on ```setup.bat```.Each OS has the executable of a different name so please use the appropriate one for your OS (I am using the linux one here).
You will get something like this:

![Guardian setup](https://raw.githubusercontent.com/ConcealNetwork/conceal-guardian/master/setup/guardian_setup.jpg)

## 3. Installation as service

As already said, you can install the Guardian as a system service. This is very easy with build in commands. (you can always see the list of all commands with ```./guardian-linux64.exe --help```).

The command to install the service is:

```./guardian-linux64.exe --service install```

Once the service is installed, you can simply run it with:

```./guardian-linux64.exe --service start```

To stop the service use the command:

```./guardian-linux64.exe --service stop```

And to remove it just use: 

```./guardian-linux64.exe --service remove```

To see if the service is running correctly and what is happening with it, you can use the command:

```./guardian-linux64.exe --service status```

As said, its very easy and that is all you need in order to work with the Guardian as a system service. The commands are the same for Windows and Linux OS. Take note that on Windows and Linux, you need **administrative** rights for working with service commands (on linux call the commands with superuser privileges).

## 4. Updating to the latest node daemon version

The Guardian supports two mode of operations:

1. You don't have a daemon (conceald) preinstalled, the Guardian takes care of everything.
2. You have the daemon preinstalled and the Guardian monitors that instance.

If you have a type 1 installation, you can use the build in updater for the daemon. Simply do: 

```./guardian-linux64.exe --node update```

The Guardian will download and update the latest stable daemon (conceald). Or if you have a fresh install and don't have the daemon yet, the Guardian will download it and install it on the first run automatically.

## 5. Updating to the latest guardian version

The updating of the guardian itself is similar and as easy as updating the node daemon. Simply type

```sudo ./guardian-linux64.exe --update```

The Guardian will download and update itself.
