call pkg index.js --targets node10-win-x64 --output .\bin\win\guardian.exe
call pkg index.js --targets node10-linux-x64 --output .\bin\linux\guardian
call pkg index.js --targets node10-macos-x64 --output .\bin\macos\guardian

rem call .\tools\upx.exe .\bin\win\guardian.exe
rem call .\tools\upx.exe .\bin\linux\guardian
rem call .\tools\upx.exe .\bin\macos\guardian