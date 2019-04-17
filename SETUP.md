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

**NOTE:** 

The precompiled binaries for the daemon, that guardian automatically downloads, are only available for Ubuntu 16.04 and 18.04 LTS versions. On other Linux version, you need to compile the daemon yourself like described [here](https://github.com/ConcealNetwork/conceal-core#compiling-conceal-from-source). On Windows there is no problems and the guardian downloads the precompiled binaries for the daemon automatically.

## 2. Options setup

You can run the Guardian in two ways. You can simply run the executable and it will start and lift up the node daemon and then monitor it. But this way, if you restart your computer, or kill the session, it will not automatically start again.
In order to persist reboots you need to install it as a system service. Luckily the Guardian makes this extremly easy for you. But first we need to configure it. The Guardian has a build in interactive setup, so this is easy to do and you don't need to edit **config.json**.

Just run it with ```./guardian-linux64 --setup``` or on windows simply click on ```setup.bat```.Each OS has the executable of a different name so please use the appropriate one for your OS (I am using the linux one here).
You will get something like this:

![Guardian setup](https://raw.githubusercontent.com/ConcealNetwork/conceal-guardian/master/setup/guardian_setup.jpg)

**Explanation of important options:**

```Please input the path to the "conceald" executable (if you do not know what to put in, leave it empty)```

This controls where your conceald daemon executable is. If you arleady have it or you want to control where it is, then you need to specify the path to the executable here. Otherwise leave it empty and the guardian will download the latest one. 

**NOTE**: The automatic donwload and install only goes for Windows and Ubuntu 16.04 and 18.04. For any other OS you need to compile your own daemon. Also note that if you leave the path empty then the guardian looks for it in the same folder as the guardian runs in 

```Please input name for your node (this will be what others see)```

This is the name of the node that will be visible in the pool. Its a mandatory input.

```Will this be a fee based remote node?```

If you wan't to run your node as remote node with a fee, then answer yes to this.

```Please input the fee address for your node (earnings will be sent to that address)```

If you are running as fee based remote node then put your wallet address here. The fees will be sent to this address.

```Will your node be accessible from the outside?```

This controls if your node will be accessible from the internet or not. If you run this internally then answer NO. If people will use it from the internet and connect to it, then you need to answer YES.

```Do you want to be listed in the nodes pool?```

Decide if you will be listed in the explorer nodes pool.

```Please input the URL of the pool (default value should be ok)```

If previous answer was yes then you select the pool address here. The default value is correct, so leave that. Just press ENTER.

```Do you want to be notified on Discord in case of problems?```

Answer YES if you want to be notified over the Discord in case the node has problems. You will be asked further questions if you answered YES.

```Do you want to be notified over email in case of problems?```

Answer YES if you want to be notified over the email in case the node has problems. You will be asked further questions if you answered YES.

## 3. Installation as service

As already said, you can install the Guardian as a system service. This is very easy with build in commands. (you can always see the list of all commands with ```./guardian-linux64 --help```).

The command to install the service is:

```./guardian-linux64 --service install```

Once the service is installed, you can simply run it with:

```./guardian-linux64 --service start```

To stop the service use the command:

```./guardian-linux64 --service stop```

And to remove it just use: 

```./guardian-linux64 --service remove```

To see if the service is running correctly and what is happening with it, you can use the command:

```./guardian-linux64 --service status```

As said, its very easy and that is all you need in order to work with the Guardian as a system service. The commands are the same for Windows and Linux OS. Take note that on Windows and Linux, you need **administrative** rights for working with service commands (on linux call the commands with superuser privileges).

## 4. Updating to the latest node daemon version

The Guardian supports two mode of operations:

1. You don't have a daemon (conceald) preinstalled, the Guardian takes care of everything.
2. You have the daemon preinstalled and the Guardian monitors that instance.

If you have a type 1 installation, you can use the build in updater for the daemon. Simply do: 

```./guardian-linux64 --node update```

The Guardian will download and update the latest stable daemon (conceald). Or if you have a fresh install and don't have the daemon yet, the Guardian will download it and install it on the first run automatically. **Note** however, that precompiled binaries are **only available** for Windows and for Ubuntu 16.04 and 18.04 LTS. On other Linux versions, you will have to compile the daemon binaries yourself as described [here](https://github.com/ConcealNetwork/conceal-core#compiling-conceal-from-source).

## 5. Updating to the latest guardian version

The updating of the guardian itself is similar and as easy as updating the node daemon. Simply type

```sudo ./guardian-linux64 --update```

The Guardian will download and update itself.
