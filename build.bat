@ECHO OFF
REM Windows build
del .\bin\win\*.* /F /Q
del .\dist\*.* /F /Q
for /D %%p in (".\bin\win\*.*") do rmdir "%%p" /s /q
call npm run package
call nexe index.js --build --target=22.18.0 -o .\bin\win\guardian-win64.exe
copy .\tools\cgservice.exe .\bin\win
xcopy /s /q /i html bin\win\html
xcopy /s /q /i dist\index.js bin\win\index.js*
copy .\commands\win\*.* .\bin\win
copy exclude.txt .\bin\win\exclude.txt
copy package.json .\bin\win\package.json
copy config.json.sample .\bin\win\config.json
.\tools\7z.exe a -r .\bin\win\guardian-win64.zip .\bin\win\*.*