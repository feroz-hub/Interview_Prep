using System;

//Q. What is the difference between “out” and “ref” parameters?
//By using ref and out keywords we can pass parameters by reference.
//When you want to return more than one values from a method then you can use out and ref parameters.

namespace What_is_the_difference_between__out__and__ref__parameters
{
    class Program
    {
        static void Main(string[] args)
        {                 
            int a;

            int b = 5;

            WithRefOut obj = new WithRefOut();
            
            int x = obj.Update(out a, ref b);

            Console.WriteLine(x);
            Console.ReadLine();
        }
        public class WithRefOut
        {
            public int Update(out int c, ref int d)
            {
                c = 100;
                return c + d;
            }
        }

        

        //3. One will use ref parameter when you want to modify a value
        //and out parameter when you want to get a new value from the called method.

    }
}
