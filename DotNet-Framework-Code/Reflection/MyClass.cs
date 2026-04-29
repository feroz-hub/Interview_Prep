using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Reflection
{
    public class MyClass
    {
        public void Add(int a, int b)
        {
           Console.WriteLine( a + b );
        }

        public void Mul(int c, int d)
        {
            Console.WriteLine(c * d);
        }
    }
}
