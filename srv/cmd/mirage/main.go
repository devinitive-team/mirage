package main

import (
	"os"

	"github.com/devinitive-team/mirage/internal/cli"
)

func main() {
	cli.Run(os.Args[1:])
}
