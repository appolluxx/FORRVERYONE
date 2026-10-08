Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strDir

exePath = strDir & "\node_modules\electron\dist\electron.exe"
mainJs = strDir & "\main.js"

If fso.FileExists(exePath) Then
    WshShell.Run """" & exePath & """ """ & mainJs & """", 0, False
Else
    WshShell.Run "cmd /c ""cd /d " & strDir & " && npx electron main.js""", 0, False
End If
