Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)
rootDir = fso.GetParentFolderName(fso.GetParentFolderName(strDir))
WshShell.CurrentDirectory = rootDir

exePath = rootDir & "\node_modules\electron\dist\electron.exe"
mainJs = strDir & "\main.js"

If fso.FileExists(exePath) Then
    WshShell.Run """" & exePath & """ """ & mainJs & """", 0, False
Else
    WshShell.Run "cmd /c ""cd /d " & rootDir & " && npx electron """ & mainJs & """""", 0, False
End If
