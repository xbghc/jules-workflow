.PHONY: build publish clean

build:
	npm install && npm run build

publish: build
ifdef OTP
	npm publish --otp=$(OTP)
else
	npm publish
endif

clean:
	rm -rf dist node_modules
