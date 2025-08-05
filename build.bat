@ECHO OFF
REM Windows build
del .\bin\win\*.* /F /Q
del .\dist\*.* /F /Q
for /D %%p in (".\bin\win\*.*") do rmdir "%%p" /s /q
if not exist ".\dist" mkdir ".\dist"
if not exist ".\bin\win" mkdir ".\bin\win"
call npm run package
xcopy /s /q /i dist .\bin\win
call npx nexe --input .\bin\win\index.js --build --target=22.18.0 --bundle -o .\bin\win\guardian-win64.exe
copy .\tools\cgservice.exe .\bin\win
xcopy /s /q /i html bin\win\html
copy .\commands\win\*.* .\bin\win
copy exclude.txt .\bin\win\exclude.txt
copy package.json .\bin\win\package.json
copy config.json.sample .\bin\win\config.json
.\tools\7z.exe a -r .\bin\win\guardian-win64.zip .\bin\win\*.*