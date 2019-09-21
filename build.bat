@ECHO OFF
REM Windows build
del .\bin\win\*.* /F /Q
for /D %%p in (".\bin\win\*.*") do rmdir "%%p" /s /q
call pkg index.js --targets node10-win-x64 --output .\bin\win\guardian-win64.exe
copy .\tools\cgservice.exe .\bin\win
xcopy /s /q /i html bin\win\html
copy .\commands\win\*.* .\bin\win
copy exclude.txt .\bin\win\exclude.txt
copy config.json.sample .\bin\win\config.json
.\tools\7z.exe a -r .\bin\win\guardian-win64.zip .\bin\win\*.*

REM Linux build
del .\bin\linux\*.* /F /Q
for /D %%p in (".\bin\linux\*.*") do rmdir "%%p" /s /q
call pkg index.js --targets node10-linux-x64 --output .\bin\linux\guardian-linux64
xcopy /s /q /i html bin\linux\html
copy exclude.txt .\bin\linux\exclude.txt
copy ccx-guardian.service.template .\bin\linux
copy config.json.sample .\bin\linux\config.json
.\tools\7z.exe a -r -ttar .\bin\linux\guardian-linux64.tar .\bin\linux\*.*
.\tools\7z.exe a -tgzip .\bin\linux\guardian-linux64.tar.gz .\bin\linux\guardian-linux64.tar

REM OSX build (uncomplete, just the binary)
REM call pkg index.js --targets node10-macos-x64 --output .\bin\macos\guardian-macos64\