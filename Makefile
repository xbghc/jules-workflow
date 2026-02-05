.PHONY: build publish clean

build:
	cd mcp && npm install && npm run build

publish: build
ifdef OTP
	cd mcp && npm publish --otp=$(OTP)
else
	cd mcp && npm publish
endif

clean:
	rm -rf mcp/dist mcp/node_modules
