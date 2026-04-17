.PHONY: build publish clean

build:
	cd cli && npm install && npm run build

publish: build
ifdef OTP
	cd cli && npm publish --otp=$(OTP)
else
	cd cli && npm publish
endif

clean:
	rm -rf cli/dist cli/node_modules
