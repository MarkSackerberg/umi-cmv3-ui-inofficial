check if the guard is enabled
	if enabled 
		if the user has an active non expired GT token
			continue
		else
			launch iframe and wait for tx
			add tx to tx builder
			send tx
			check GT expired
	else
		continue
