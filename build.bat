call pkg index.js --targets node10-win-x64 --output .\bin\win\guardian-win64.exe
call pkg index.js --targets node10-linux-x64 --output .\bin\linux\guardian-linux64
call pkg index.js --targets node10-macos-x64 --output .\bin\macos\guardian-macos64

rem call .\tools\upx.exe .\bin\win\guardian.exe
rem call .\tools\upx.exe .\bin\linux\guardian
rem call .\tools\upx.exe .\bin\macos\guardian