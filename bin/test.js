#!/usr/bin/env node

const sleep = time => {
	return new Promise(resolve => {
		setTimeout(resolve, time)
	})
}

sleep(5 * 1000)
