Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)
desktopVbs = strDir & "\apps\desktop\Launch_IDE.vbs"
WshShell.Run """" & desktopVbs & """", 0, False
