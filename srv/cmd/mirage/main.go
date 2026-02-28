package main

import (
	"context"
	"log"
	"os"

	"github.com/devinitive-team/mirage/internal/cli"
)

func main() {
	cmd := cli.NewApp()
	if err := cmd.Run(context.Background(), os.Args); err != nil {
		log.Fatal(err)
	}
}
