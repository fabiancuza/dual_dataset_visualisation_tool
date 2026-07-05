interface Province {
  code: string;
  name: string;
}

interface Municipality {
  code: string;
  name: string;
  province: Province;
}