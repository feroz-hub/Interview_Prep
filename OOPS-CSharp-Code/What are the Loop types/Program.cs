using System;

//Q. What are the Loop types in C#?

namespace What_are_the_Loop_types
{
    class Program
    {
        static void Main(string[] args)
        {

            //While Loop
            
            int i = 0;            
            while(i < 5)
            {
                Console.WriteLine(i);
                i++;
            }

            //Output: 0 1 2 3 4

            //Do While
            
            int j = 100;
            do
            {
                Console.WriteLine(j);
                j++;
            }
            while(j < 10);

            //Output: 100


            //For Loop

            for(int k = 0 ; k < 5; k++)
            {
                
                Console.WriteLine(k);

            }

            //Output: 0 1 2 3 4


            //ForEach Loop

            int[] arr = new int[] { 1,2,3,4};

            foreach (int items in arr)
            {
                Console.WriteLine(items);
            }

            //Output: 1 2 3 4

            Console.ReadLine();

        }

    }
}

